import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDTO {
  @IsString()
  @IsNotEmpty()
  @IsJWT()
  refreshToken: string;
}