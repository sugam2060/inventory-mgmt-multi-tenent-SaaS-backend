import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LoginDTO {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}