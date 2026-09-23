import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from '../hashing.service';
import * as bcrypt from 'bcrypt';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // HASH TESTS
  // ==========================================
  describe('hash', () => {
    it('should call bcrypt.hash with password and salt rounds', async () => {
      const password = 'mySecretPassword123';

      const result = await service.hash(password);

      expect(result).toMatch(/^\$2[aby]\$10\$/);
      await expect(bcrypt.compare(password, result)).resolves.toBe(true);
    });
  });

  // ==========================================
  // COMPARE TESTS
  // ==========================================
  describe('compare', () => {
    it('should return true when password matches hash', async () => {
      const password = 'mySecretPassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await service.compare(password, hash);

      expect(result).toBe(true);
    });

    it('should return false when password does not match hash', async () => {
      const password = 'wrongPassword';
      const hash = await bcrypt.hash('mySecretPassword123', 10);

      const result = await service.compare(password, hash);

      expect(result).toBe(false);
    });
  });
});