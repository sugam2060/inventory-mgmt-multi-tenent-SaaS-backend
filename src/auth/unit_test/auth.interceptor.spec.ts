import { Test, TestingModule } from '@nestjs/testing';
import { AuthInterceptor } from '../auth.interceptor';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, of, throwError, lastValueFrom } from 'rxjs';

describe('AuthInterceptor', () => {
  let interceptor: AuthInterceptor;
  let reflector: jest.Mocked<Reflector>;

  // Mock response object
  const mockResponse = {
    statusCode: 200,
  };

  // Mock execution context
  const createMockContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  // Mock call handler
  const createMockCallHandler = (response$: Observable<unknown>): CallHandler => ({
    handle: () => response$,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthInterceptor,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<AuthInterceptor>(AuthInterceptor);
    reflector = module.get(Reflector);

    mockResponse.statusCode = 200; // Reset status code default
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  // ==========================================
  // SUCCESSFUL RESPONSE HANDLING
  // ==========================================
  describe('Success Responses', () => {
    it('should format custom ApiResponse and exclude data when INCLUDE_RESPONSE_DATA is false or omitted', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockContext();
      const customResponse = {
        message: 'Login Successfully',
        data: { accessToken: 'token123' },
      };
      const next = createMockCallHandler(of(customResponse));

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        status: 200,
        message: 'Login Successfully',
      });
      expect(result).not.toHaveProperty('data');
    });

    it('should format custom ApiResponse and include data when INCLUDE_RESPONSE_DATA is true', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockContext();
      const customResponse = {
        message: 'Login Successfully',
        data: { accessToken: 'token123' },
      };
      const next = createMockCallHandler(of(customResponse));

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        status: 200,
        message: 'Login Successfully',
        data: { accessToken: 'token123' },
      });
    });

    it('should format raw return objects when result is not a custom ApiResponse and metadata is true', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockContext();
      const rawData = { id: '123', name: 'Acme Corp' };
      const next = createMockCallHandler(of(rawData));

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        status: 200,
        message: 'Request successful',
        data: rawData,
      });
    });

    it('should format fallback response message when status >= 400 on success pipeline', async () => {
      mockResponse.statusCode = 400;
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockContext();
      const next = createMockCallHandler(of('some_result'));

      const result$ = interceptor.intercept(context, next);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({
        status: 400,
        message: 'Request failed',
      });
    });
  });

  // ==========================================
  // ERROR RESPONSE HANDLING
  // ==========================================
  describe('Error Responses', () => {
    it('should catch HttpException with string message and throw formatted HttpException', async () => {
      const context = createMockContext();
      const httpException = new HttpException('Custom unauthorized error', HttpStatus.UNAUTHORIZED);
      const next = createMockCallHandler(throwError(() => httpException));

      const result$ = interceptor.intercept(context, next);

      await expect(lastValueFrom(result$)).rejects.toThrow(HttpException);

      try {
        await lastValueFrom(result$);
      } catch (error) {
        const err = error as HttpException;
        expect(err.getStatus()).toBe(401);
        expect(err.getResponse()).toEqual({
          status: 401,
          message: 'Custom unauthorized error',
        });
      }
    });

    it('should extract validation array messages from class-validator response', async () => {
      const context = createMockContext();
      const validationError = new HttpException(
        {
          statusCode: 400,
          message: ['email must be an email', 'password is too short'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
      const next = createMockCallHandler(throwError(() => validationError));

      const result$ = interceptor.intercept(context, next);

      try {
        await lastValueFrom(result$);
      } catch (error) {
        const err = error as HttpException;
        expect(err.getStatus()).toBe(400);
        expect(err.getResponse()).toEqual({
          status: 400,
          message: 'email must be an email, password is too short',
        });
      }
    });

    it('should handle unhandled non-HttpExceptions as Internal Server Error (500)', async () => {
      const context = createMockContext();
      const standardError = new Error('Database connection failed');
      const next = createMockCallHandler(throwError(() => standardError));

      const result$ = interceptor.intercept(context, next);

      try {
        await lastValueFrom(result$);
      } catch (error) {
        const err = error as HttpException;
        expect(err.getStatus()).toBe(500);
        expect(err.getResponse()).toEqual({
          status: 500,
          message: 'Internal server error',
        });
      }
    });
  });
});