import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RegisterBusinessDTO } from './dto/registration.dto';
import { AuthService } from './auth.service';
import { IncludeResponseData } from '../common/decorators/response-data.decorator';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {}


    @Post("/register")
    @HttpCode(HttpStatus.CREATED)
    @IncludeResponseData()
    register (@Body() data: RegisterBusinessDTO) {
        return this.authService.register(data);
    }
}
