import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';

@Module({
    imports:[
        DatabaseModule,
        MailModule,
        ConfigModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: '20m',
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService,HashingService]
})
export class AuthModule {}
