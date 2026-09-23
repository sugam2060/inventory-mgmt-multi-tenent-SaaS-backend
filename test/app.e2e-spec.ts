import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthService } from './../src/auth/auth.service';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;
  let authService: {
    login: jest.Mock;
    refreshToken: jest.Mock;
  };

  beforeAll(async () => {
    authService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('boots the application', () => {
    expect(app).toBeDefined();
  });

  it('returns 404 for an unknown route', () => {
    return request(app.getHttpServer())
      .get('/does-not-exist')
      .expect(404);
  });

  describe('auth routes', () => {
    it('logs in through the HTTP endpoint and includes token data', async () => {
      authService.login.mockResolvedValueOnce({
        message: 'Login Successfully',
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'johndoe', password: 'password123' })
        .expect(200)
        .expect({
          status: 200,
          message: 'Login Successfully',
          data: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        });

      expect(authService.login).toHaveBeenCalledWith({
        username: 'johndoe',
        password: 'password123',
      });
    });

    it('refreshes tokens from the Authorization header', async () => {
      authService.refreshToken.mockResolvedValueOnce({
        message: 'Login Successfully',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .set('Authorization', 'Bearer refresh-token')
        .expect(200)
        .expect({
          status: 200,
          message: 'Login Successfully',
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        });

      expect(authService.refreshToken).toHaveBeenCalledWith('refresh-token');
    });

    it('rejects a refresh request without a Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .expect(401)
        .expect({
          status: 401,
          message: 'Bearer refresh token is required.',
        });

      expect(authService.refreshToken).not.toHaveBeenCalled();
    });
  });
});
