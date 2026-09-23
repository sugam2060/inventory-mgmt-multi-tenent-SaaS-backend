import { Test, TestingModule } from '@nestjs/testing';
import { RefreshService, RefreshUser } from '../refresh.service';
import { DatabaseService } from '../../database/database.service';
import { UnauthorizedException } from '@nestjs/common';

describe('RefreshService', () => {
  let service: RefreshService;

  // Helper mock for Drizzle transaction object
  const mockTransaction = {
    execute: jest.fn(),
    select: jest.fn(),
    from: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
    values: jest.fn(),
  };

  const mockDbTransaction = jest.fn();

  beforeEach(async () => {
    // Setup chainable mock methods for Drizzle query builder inside transaction
    mockTransaction.select.mockReturnValue({ from: mockTransaction.from });
    mockTransaction.from.mockReturnValue({ innerJoin: mockTransaction.innerJoin });
    mockTransaction.innerJoin.mockReturnValue({ where: mockTransaction.where });
    mockTransaction.where.mockReturnValue({ limit: mockTransaction.limit });

    mockTransaction.delete.mockReturnValue({ where: mockTransaction.where });
    mockTransaction.insert.mockReturnValue({ values: mockTransaction.values });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshService,
        {
          provide: DatabaseService,
          useValue: {
            db: {
              transaction: mockDbTransaction,
            },
          },
        },
      ],
    }).compile();

    service = module.get<RefreshService>(RefreshService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // FIND USER BY TOKEN TESTS
  // ==========================================
  describe('findUserByToken', () => {
    const rawToken = 'sample-refresh-token';

    it('should return user profile if token match is found and user is active', async () => {
      const mockUser: RefreshUser = {
        id: 'user-123',
        fullname: 'John Doe',
        tenent_id: 'tenant-456',
        isActive: true,
      };

      mockTransaction.limit.mockResolvedValueOnce([mockUser]);
      mockDbTransaction.mockImplementationOnce(async (cb) => cb(mockTransaction));

      const result = await service.findUserByToken(rawToken);

      expect(mockDbTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransaction.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          queryChunks: expect.arrayContaining([
            expect.objectContaining({
              value: expect.arrayContaining(['select set_config(\'app.refresh_token_hash\', ']),
            }),
          ]),
        }),
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if no matching user is found', async () => {
      mockTransaction.limit.mockResolvedValueOnce([]);
      mockDbTransaction.mockImplementationOnce(async (cb) => cb(mockTransaction));

      await expect(service.findUserByToken(rawToken)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token.'),
      );
    });

    it('should throw UnauthorizedException if user found is not active', async () => {
      const mockInactiveUser: RefreshUser = {
        id: 'user-123',
        fullname: 'John Doe',
        tenent_id: 'tenant-456',
        isActive: false,
      };

      mockTransaction.limit.mockResolvedValueOnce([mockInactiveUser]);
      mockDbTransaction.mockImplementationOnce(async (cb) => cb(mockTransaction));

      await expect(service.findUserByToken(rawToken)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token.'),
      );
    });
  });

  // ==========================================
  // ROTATE TOKEN TESTS
  // ==========================================
  describe('rotate', () => {
    const userId = 'user-123';

    it('should delete existing refresh token, insert new token record, and return raw token', async () => {
      mockTransaction.execute.mockResolvedValue(undefined);
      mockTransaction.where.mockResolvedValueOnce(undefined);
      mockTransaction.values.mockResolvedValueOnce(undefined);

      mockDbTransaction.mockImplementationOnce(async (cb) => cb(mockTransaction));

      const returnedToken = await service.rotate(userId);

      expect(returnedToken).toMatch(/^[A-Za-z0-9_-]{64}$/);
      expect(mockTransaction.execute).toHaveBeenCalledTimes(2);
      expect(mockTransaction.delete).toHaveBeenCalledTimes(1);
      expect(mockTransaction.insert).toHaveBeenCalledTimes(1);
      expect(mockTransaction.values).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          token_hash: expect.any(String),
          expires_at: expect.any(Date),
        }),
      );
    });
  });
});