import { Body, Controller, Post } from '@nestjs/common';
import { RegisterBusinessDTO } from './dto/registration.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {}


    @Post("/register")
    register (@Body() data: RegisterBusinessDTO) {
        return this.authService.register(data);
    }
}
