import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

type AccessTokenPayload = {
  sub: string;
  tenent_id: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const accessToken = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!accessToken) {
      throw new UnauthorizedException('Bearer access token is required.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        accessToken,
      );
      request.body = {
        user_id: payload.sub,
        tenent_id: payload.tenent_id,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}
