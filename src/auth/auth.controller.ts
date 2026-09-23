import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { RegisterBusinessDTO } from './dto/registration.dto';
import { AuthService } from './auth.service';
import { IncludeResponseData } from '../common/decorators/response-data.decorator';
import { LoginDTO } from './dto/login.dto';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {}


    @Post("/register")
    @HttpCode(HttpStatus.CREATED)
    @IncludeResponseData()
    register (@Body() data: RegisterBusinessDTO) {
        return this.authService.register(data);
    }

    @Post("/login")
    @HttpCode(HttpStatus.OK)
    @IncludeResponseData()
    login (@Body() data: LoginDTO) {
        return this.authService.login(data);
    }

    @Post('/refresh-token')
    @HttpCode(HttpStatus.OK)
    @IncludeResponseData()
    refreshToken(@Headers('authorization') authorization?: string) {
        const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

        if (!token) {
            throw new UnauthorizedException('Bearer refresh token is required.');
        }

        return this.authService.refreshToken(token);
    }
}
