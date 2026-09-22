import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { HashingService } from './hashing.service';
import { RegisterBusinessDTO } from './dto/registration.dto';
import { eq, sql,or } from 'drizzle-orm';
import { business } from '../database/schema/business.schema';
import { role_template } from '../database/schema/role_template.schema';
import { user_profile } from '../database/schema/user_profile.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly hashingService: HashingService,
        private readonly mailService: MailService
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
}
