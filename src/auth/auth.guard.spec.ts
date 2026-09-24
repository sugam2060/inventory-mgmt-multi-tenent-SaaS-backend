import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let request: { headers: { authorization?: string }; body?: unknown };
  let context: ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    guard = new AuthGuard(jwtService);
    request = { headers: {} };
    context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should verify the Bearer token and append its payload to the request body', async () => {
    const accessToken = 'valid-access-token';
    const payload = {
      sub: 'user-id',
      tenent_id: 'tenant-id',
    };
    request.headers.authorization = `Bearer ${accessToken}`;
    jwtService.verifyAsync.mockResolvedValueOnce(payload);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(accessToken);
    expect(request.body).toEqual({
      user_id: payload.sub,
      tenent_id: payload.tenent_id,
    });
  });

  it('should reject a missing authorization header', async () => {
    await expect(guard.canActivate(context)).rejects.toEqual(
      new UnauthorizedException('Bearer access token is required.'),
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should reject an invalid access token', async () => {
    request.headers.authorization = 'Bearer invalid-access-token';
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid token'));

    await expect(guard.canActivate(context)).rejects.toEqual(
      new UnauthorizedException('Invalid or expired access token.'),
    );
  });
});
