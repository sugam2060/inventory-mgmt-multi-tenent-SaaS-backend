import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';

@Module({
    imports:[
        DatabaseModule
    ],
    controllers: [AuthController],
    providers: [AuthService,HashingService]
})
export class AuthModule {}
