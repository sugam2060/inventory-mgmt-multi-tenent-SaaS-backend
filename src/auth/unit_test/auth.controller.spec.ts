import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { RegisterBusinessDTO } from '../dto/registration.dto';
import { LoginDTO } from '../dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==========================================
  // REGISTER ROUTE TESTS
  // ==========================================
  describe('register', () => {
    const registerDto: RegisterBusinessDTO = {
      name: 'Acme Corp',
      slug: 'acme-corp',
      pan_no: '123456789',
      fullname: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'SecurePassword123!',
    };

    it('should call authService.register with the provided data', async () => {
      const expectedResponse = {
        message: 'Email has been sent to you. Please verify to continue',
      };
      authService.register.mockResolvedValueOnce(expectedResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ==========================================
  // LOGIN ROUTE TESTS
  // ==========================================
  describe('login', () => {
    const loginDto: LoginDTO = {
      username: 'johndoe',
      password: 'password123',
    };

    it('should call authService.login with the provided credentials', async () => {
      const expectedResponse = {
        message: 'Login Successfully',
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      };
      authService.login.mockResolvedValueOnce(expectedResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ==========================================
  // REFRESH TOKEN ROUTE TESTS
  // ==========================================
  describe('refreshToken', () => {
    it('should throw UnauthorizedException if authorization header is missing', () => {
      expect(() => controller.refreshToken(undefined)).toThrow(
        new UnauthorizedException('Bearer refresh token is required.'),
      );
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if authorization header is not Bearer format', () => {
      expect(() => controller.refreshToken('Basic token123')).toThrow(
        new UnauthorizedException('Bearer refresh token is required.'),
      );
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('should extract Bearer token and call authService.refreshToken', async () => {
      const mockToken = 'valid-refresh-token';
      const authHeader = `Bearer ${mockToken}`;
      const expectedResponse = {
        message: 'Login Successfully',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      authService.refreshToken.mockResolvedValueOnce(expectedResponse);

      const result = await controller.refreshToken(authHeader);

      expect(authService.refreshToken).toHaveBeenCalledWith(mockToken);
      expect(authService.refreshToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle Bearer token extraction with extra spaces or case variation', async () => {
      const mockToken = 'valid-token-case-test';
      const authHeader = `bearer   ${mockToken}`;
      const expectedResponse = {
        message: 'Login Successfully',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      authService.refreshToken.mockResolvedValueOnce(expectedResponse);

      const result = await controller.refreshToken(authHeader);

      expect(authService.refreshToken).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(expectedResponse);
    });
  });
});