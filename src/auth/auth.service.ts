import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { HashingService } from './hashing.service';
import { RegisterBusinessDTO } from './dto/registration.dto';
import { eq, sql, or, and } from 'drizzle-orm';
import { business } from '../database/schema/business.schema';
import { role_template } from '../database/schema/role_template.schema';
import { user_profile } from '../database/schema/user_profile.schema';
import { MailService } from '../mail/mail.service';
import { LoginDTO } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshService, type RefreshUser } from './refresh.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly hashingService: HashingService,
        private readonly mailService: MailService,
        private readonly jwtService: JwtService,
        private readonly refreshService: RefreshService,
    ) { }


    async register(data: RegisterBusinessDTO) {
        const { name, slug, pan_no, fullname, username, email, password } = data;

        // Single round-trip pre-check, outside the transaction
        const [existing] = await this.databaseService.db
            .select({
                username: user_profile.username,
                email: user_profile.email,
                isActive: user_profile.is_active,
            })
            .from(user_profile)
            .where(or(eq(user_profile.username, username), eq(user_profile.email, email)))
            .limit(1);

        if (existing) {
            if (!existing.isActive) {
                return { message: 'Please verify your email first.' };
            }
            throw new ConflictException(
                existing.username === username ? 'Username already taken.' : 'Email already registered.',
            );
        }

        const passwordHash = await this.hashingService.hash(password);

        try {
            const result = await this.databaseService.db.transaction(async (transaction) => {
                await transaction.execute(sql`select set_config('app.signup_mode', 'true', true)`);

                const [createdBusiness] = await transaction
                    .insert(business)
                    .values({ name, slug, pan_no })
                    .returning({ id: business.id });

                const [ownerRole] = await transaction
                    .insert(role_template)
                    .values({ tenent_id: createdBusiness.id, template_name: 'owner', is_owner: true })
                    .returning({ id: role_template.id });

                const [createdUser] = await transaction
                    .insert(user_profile)
                    .values({
                        tenent_id: createdBusiness.id,
                        role_template_id: ownerRole.id,
                        fullname,
                        username,
                        email,
                        password: passwordHash,
                        is_active: false,
                    })
                    .returning({ id: user_profile.id });

                if (!createdUser) throw new Error('User could not be created.');

                return {
                    userId: createdUser.id,
                    businessId: createdBusiness.id,
                };
            });

            try {
                const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

                void this.mailService.sendWelcomeEmail(email, {
                    businessName: name,
                    name: fullname,
                    verificationUrl: `${appUrl}/api/v1/auth/verify-email?userId=${result.userId}`,
                });
            } catch (error) {
                this.logger.error(
                    `Welcome email could not be sent to ${email}.`,
                    error instanceof Error ? error.stack : String(error),
                );

                return {
                    message: 'Account created, but the verification email could not be sent. Please request a new verification email.',
                };
            }

            return { message: 'Email has been sent to you. Please verify to continue' };
        } catch (error) {
            const databaseError = error as { code?: string; cause?: { code?: string } };
            if (databaseError.code === '23505' || databaseError.cause?.code === '23505') {
                throw new ConflictException('Business, username, or email already exists.');
            }
            throw error;
        }
    }


    async login(data: LoginDTO) {
        const { username, email,password } = data;

        if (!username && !email) {
            throw new BadRequestException('Username or email is required.');
        }

        try {
            const user = await this.databaseService.db
            .select({
                id: user_profile.id,
                password: user_profile.password,
                fullname: user_profile.fullname,
                email:user_profile.email,
                tenent_id: user_profile.tenent_id,
                isActive: user_profile.is_active,
                business_name:business.name
            })
            .from(user_profile).innerJoin(business, eq(user_profile.tenent_id,business.id))
            .where(
                username
                    ? eq(user_profile.username, username)
                    : eq(user_profile.email, email!),
            )
            .limit(1);

            const [matchedUser] = user;

            if (!matchedUser) {
                throw new UnauthorizedException('Invalid username/email or password.');
            }

            if (!matchedUser.isActive) {
                void this.mailService.sendWelcomeEmail(user[0].email,{
                    businessName:matchedUser.business_name,
                    name:matchedUser.fullname,
                    verificationUrl: `$http://localhost:3000/api/v1/auth/verify-email?userId=${matchedUser.id}` 
                })
                throw new UnauthorizedException('Please verify your email first.');
            }

            const isPasswordValid = await this.hashingService.compare(
                password,
                matchedUser.password,
            );

            if (!isPasswordValid) {
                throw new UnauthorizedException('Invalid username/email or password.');
            }

            return this.createTokenPair(matchedUser);
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error('Login failed.', error instanceof Error ? error.stack : String(error));
            throw new UnauthorizedException('Unable to log in.');
        }
    }

    async refreshToken(token: string) {
        if (!token?.trim()) {
            throw new UnauthorizedException('Refresh token is required.');
        }

        try {
            const user = await this.refreshService.findUserByToken(token);
            return this.createTokenPair(user);
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            throw new UnauthorizedException('Invalid or expired refresh token.');
        }
    }

    private async createTokenPair(user: RefreshUser) {
        const payload = {
            sub: user.id,
            tenent_id: user.tenent_id,
            fullname: user.fullname,
        };

        const refreshToken = await this.refreshService.rotate(user.id);

        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '20m' });

        return {
            message:"Login Successfully",
            data: {
                accessToken,
            refreshToken,
            }
        };
    }

    async getUserInfo (user_id:string, tenent_id:string){
        // We will implement the cache mechanism in this later
        try {
            const [userInfo] = await this.databaseService.db.select({
                fullname:user_profile.fullname,
                name:business.name
            }).from(user_profile).innerJoin(business,eq(user_profile.tenent_id,business.id)).where(
                and(
                    eq(user_profile.id,user_id),
                    eq(business.id,tenent_id)
                )
            ).limit(1);

            if (!userInfo) {
                throw new UnauthorizedException('User information not found.');
            }

            return {
                message: 'User information fetched successfully.',
                data: userInfo,
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }

            this.logger.error(
                'Failed to fetch user information.',
                error instanceof Error ? error.stack : String(error),
            );
            throw new InternalServerErrorException(
                'Unable to fetch user information.',
            );
        }
    }
}
