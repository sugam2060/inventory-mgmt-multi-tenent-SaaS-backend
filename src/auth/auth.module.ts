import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';
import { RefreshService } from './refresh.service';

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
    providers: [AuthService, AuthGuard, HashingService, RefreshService]
})
export class AuthModule {}
