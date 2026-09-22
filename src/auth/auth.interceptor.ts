import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Response } from 'express';
import { INCLUDE_RESPONSE_DATA } from '../common/decorators/response-data.decorator';


export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data?: T;
}

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse> {
    const response: Response = context.switchToHttp().getResponse();
    const includeData = this.reflector.getAllAndOverride<boolean>(
      INCLUDE_RESPONSE_DATA,
      [context.getHandler(), context.getClass()],
    ) ?? false;

    return next.handle().pipe(
      map((result: unknown) => {
        if (isApiResponse(result)) {
          return {
            status: response.statusCode,
            message: result.message,
            ...(includeData && result.data !== undefined
              ? { data: result.data }
              : {}),
          };
        }

        return {
          status: response.statusCode,
          message: response.statusCode >= 400 ? 'Request failed' : 'Request successful',
          ...(includeData && result !== undefined ? { data: result } : {}),
        };
      }),
      catchError((error: unknown) => {
        const status = error instanceof HttpException
          ? error.getStatus()
          : 500;

        return throwError(() => new HttpException({
          status,
          message: getErrorMessage(error, status),
        }, status));
      }),
    );
  }
}

function getErrorMessage(error: unknown, status: number): string {
  if (!(error instanceof HttpException)) {
    return status >= 500 ? 'Internal server error' : 'Request failed';
  }

  const response = error.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  if (typeof response === 'object' && response !== null && 'message' in response) {
    const message = response.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return error.message;
}

function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}
