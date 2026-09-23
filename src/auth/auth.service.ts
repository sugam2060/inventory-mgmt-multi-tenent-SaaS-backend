import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { HashingService } from './hashing.service';
import { RegisterBusinessDTO } from './dto/registration.dto';
import { sql } from 'drizzle-orm';
import { business } from '../database/schema/business.schema';
import { role_template } from '../database/schema/role_template.schema';
import { user_profile } from '../database/schema/user_profile.schema';

@Injectable()
export class AuthService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly hashingService: HashingService,
    ){}
    

    async register (data: RegisterBusinessDTO) {
        const { name, slug, pan_no, fullname, username, email, password } = data;
        const passwordHash = await this.hashingService.hash(password);

        try {
            return await this.databaseService.db.transaction(async (transaction) => {
                await transaction.execute(
                    sql`select set_config('app.signup_mode', 'true', true)`,
                );

                const [createdBusiness] = await transaction
                    .insert(business)
                    .values({ name, slug, pan_no })
                    .returning({ id: business.id });

                const [ownerRole] = await transaction
                    .insert(role_template)
                    .values({
                        tenent_id: createdBusiness.id,
                        template_name: 'owner',
                        is_owner: true,
                    })
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
                        is_active: true,
                    })
                    .returning({
                        id: user_profile.id,
                        tenantId: user_profile.tenent_id,
                        fullname: user_profile.fullname,
                    });

                return createdUser;
            });
        } catch (error) {
            if ((error as { code?: string }).code === '23505') {
                throw new ConflictException('Business, username, or email already exists.');
            }

            throw error;
        }
    }
}
