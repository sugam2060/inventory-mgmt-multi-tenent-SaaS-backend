import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { DatabaseService } from '../../database/database.service';
import { HashingService } from '../hashing.service';
import { MailService } from '../../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshService } from '../refresh.service';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterBusinessDTO } from '../dto/registration.dto';
import { LoginDTO } from '../dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let hashingService: jest.Mocked<HashingService>;
  let mailService: jest.Mocked<MailService>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshService: jest.Mocked<RefreshService>;

  // Helper mocks for Drizzle ORM chainable methods
  const mockDbSelect = jest.fn();
  const mockDbFrom = jest.fn();
  const mockDbWhere = jest.fn();
  const mockDbLimit = jest.fn();
  const mockDbInnerJoin = jest.fn();
  const mockDbTransaction = jest.fn();

  beforeEach(async () => {
    // Reset mock query chain structures
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbFrom.mockReturnValue({
      where: mockDbWhere,
      innerJoin: mockDbInnerJoin,
    });
    mockDbInnerJoin.mockReturnValue({ where: mockDbWhere });
    mockDbWhere.mockReturnValue({ limit: mockDbLimit });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: {
            db: {
              select: mockDbSelect,
              transaction: mockDbTransaction,
            },
          },
        },
        {
          provide: HashingService,
          useValue: {
            hash: jest.fn(),
            compare: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendWelcomeEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: RefreshService,
          useValue: {
            findUserByToken: jest.fn(),
            rotate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    hashingService = module.get(HashingService);
    mailService = module.get(MailService);
    jwtService = module.get(JwtService);
    refreshService = module.get(RefreshService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // REGISTER TESTS
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

    it('should throw ConflictException if active username already exists', async () => {
      mockDbLimit.mockResolvedValueOnce([
        { username: 'johndoe', email: 'other@example.com', isActive: true },
      ]);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Username already taken.'),
      );
    });

    it('should throw ConflictException if active email already exists', async () => {
      mockDbLimit.mockResolvedValueOnce([
        { username: 'otheruser', email: 'john@example.com', isActive: true },
      ]);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email already registered.'),
      );
    });

    it('should return verification message if user exists but is not active', async () => {
      mockDbLimit.mockResolvedValueOnce([
        { username: 'johndoe', email: 'john@example.com', isActive: false },
      ]);

      const result = await service.register(registerDto);
      expect(result).toEqual({ message: 'Please verify your email first.' });
    });

    it('should successfully register a business and owner user', async () => {
      // 1. Pre-check finds no existing user
      mockDbLimit.mockResolvedValueOnce([]);

      // 2. Mock password hash
      hashingService.hash.mockResolvedValueOnce('hashed_password');

      // 3. Mock transaction execution
      const mockTx = {
        execute: jest.fn().mockResolvedValue(undefined),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'bus-123' }]) // business
          .mockResolvedValueOnce([{ id: 'role-123' }]) // role_template
          .mockResolvedValueOnce([{ id: 'user-123' }]), // user_profile
      };

      mockDbTransaction.mockImplementationOnce(async (cb) => cb(mockTx));

      const result = await service.register(registerDto);

      expect(hashingService.hash).toHaveBeenCalledWith('SecurePassword123!');
      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'john@example.com',
        expect.objectContaining({
          businessName: 'Acme Corp',
          name: 'John Doe',
        }),
      );
      expect(result).toEqual({
        message: 'Email has been sent to you. Please verify to continue',
      });
    });

    it('should send the welcome email after registration', async () => {
      mockDbLimit.mockResolvedValueOnce([]);
      hashingService.hash.mockResolvedValueOnce('hashed_password');

      const mockTx = {
        execute: jest.fn().mockResolvedValue(undefined),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'bus-123' }])
          .mockResolvedValueOnce([{ id: 'role-123' }])
          .mockResolvedValueOnce([{ id: 'user-123' }]),
      };

      mockDbTransaction.mockImplementationOnce(async (cb) => cb(mockTx));
      mailService.sendWelcomeEmail.mockResolvedValueOnce(undefined);

      const result = await service.register(registerDto);

      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'john@example.com',
        expect.objectContaining({
          businessName: 'Acme Corp',
          name: 'John Doe',
        }),
      );
      expect(result).toEqual({
        message: 'Email has been sent to you. Please verify to continue',
      });
    });

    it('should throw ConflictException on database unique constraint error (23505)', async () => {
      mockDbLimit.mockResolvedValueOnce([]);
      hashingService.hash.mockResolvedValueOnce('hashed_password');

      mockDbTransaction.mockRejectedValueOnce({ code: '23505' });

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Business, username, or email already exists.'),
      );
    });
  });

  // ==========================================
  // LOGIN TESTS
  // ==========================================
  describe('login', () => {
    const loginDto: LoginDTO = {
      username: 'johndoe',
      password: 'password123',
    };

    const mockUserRecord = {
      id: 'user-123',
      password: 'hashed_password',
      fullname: 'John Doe',
      email: 'john@example.com',
      tenent_id: 'bus-123',
      isActive: true,
      business_name: 'Acme Corp',
    };

    it('should throw BadRequestException if neither username nor email is provided', async () => {
      await expect(
        service.login({ password: 'password123' } as any),
      ).rejects.toThrow(
        new BadRequestException('Username or email is required.'),
      );
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockDbLimit.mockResolvedValueOnce([]);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid username/email or password.'),
      );
    });

    it('should send email and throw UnauthorizedException if user is inactive', async () => {
      mockDbLimit.mockResolvedValueOnce([
        { ...mockUserRecord, isActive: false },
      ]);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Please verify your email first.'),
      );

      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'john@example.com',
        expect.objectContaining({
          businessName: 'Acme Corp',
          name: 'John Doe',
        }),
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockDbLimit.mockResolvedValueOnce([mockUserRecord]);
      hashingService.compare.mockResolvedValueOnce(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid username/email or password.'),
      );
    });

    it('should return token pair on successful login', async () => {
      mockDbLimit.mockResolvedValueOnce([mockUserRecord]);
      hashingService.compare.mockResolvedValueOnce(true);
      refreshService.rotate.mockResolvedValueOnce('refresh-token-xyz');
      jwtService.signAsync.mockResolvedValueOnce('access-token-abc');

      const result = await service.login(loginDto);

      expect(refreshService.rotate).toHaveBeenCalledWith('user-123');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 'user-123',
          tenent_id: 'bus-123',
          fullname: 'John Doe',
        },
        { expiresIn: '20m' },
      );
      expect(result).toEqual({
        message: 'Login Successfully',
        data: {
          accessToken: 'access-token-abc',
          refreshToken: 'refresh-token-xyz',
        },
      });
    });
  });

  // ==========================================
  // REFRESH TOKEN TESTS
  // ==========================================
  describe('refreshToken', () => {
    it('should throw UnauthorizedException if refresh token is empty', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(
        new UnauthorizedException('Refresh token is required.'),
      );
    });

    it('should generate new tokens when given a valid refresh token', async () => {
      const mockRefreshUser = {
        id: 'user-123',
        tenent_id: 'bus-123',
        fullname: 'John Doe',
      };

      refreshService.findUserByToken.mockResolvedValueOnce(
        mockRefreshUser as any,
      );
      refreshService.rotate.mockResolvedValueOnce('new-refresh-token');
      jwtService.signAsync.mockResolvedValueOnce('new-access-token');

      const result = await service.refreshToken('valid-token');

      expect(refreshService.findUserByToken).toHaveBeenCalledWith(
        'valid-token',
      );
      expect(result).toEqual({
        message: 'Login Successfully',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });
    });

    it('should throw UnauthorizedException when refresh service fails', async () => {
      refreshService.findUserByToken.mockRejectedValueOnce(
        new Error('Token expired'),
      );

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token.'),
      );
    });
  });

  describe('getUserInfo', () => {
    it('should return the user fullname and business name', async () => {
      const userInfo = {
        fullname: 'John Doe',
        name: 'Acme Corp',
      };
      mockDbLimit.mockResolvedValueOnce([userInfo]);

      const result = await service.getUserInfo('user-id', 'tenant-id');

      expect(result).toEqual({
        message: 'User information fetched successfully.',
        data: userInfo,
      });
      expect(mockDbSelect).toHaveBeenCalledTimes(1);
      expect(mockDbWhere).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when the user is not found', async () => {
      mockDbLimit.mockResolvedValueOnce([]);

      await expect(
        service.getUserInfo('missing-user-id', 'tenant-id'),
      ).rejects.toThrow(
        new UnauthorizedException('User information not found.'),
      );
    });

    it('should throw InternalServerErrorException when the query fails', async () => {
      mockDbLimit.mockRejectedValueOnce(new Error('Database unavailable'));

      await expect(service.getUserInfo('user-id', 'tenant-id')).rejects.toThrow(
        new InternalServerErrorException('Unable to fetch user information.'),
      );
    });
  });
});