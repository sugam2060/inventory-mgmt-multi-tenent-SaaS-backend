import {IsString,IsEmail} from "class-validator"




export class RegisterBusinessDTO {
    @IsString()
    name:string;
    
    @IsString()
    slug:string;

    @IsString()
    pan_no:string

    @IsString()
    fullname:string

    @IsString()
    username:string

    @IsEmail()
    email:string

    @IsString()
    password:string
}