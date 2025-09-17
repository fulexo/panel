import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessError extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        errorCode: 'BUSINESS_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
      status
    );
  }
}

export class ValidationError extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      {
        errorCode: 'VALIDATION_ERROR',
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class AuthenticationError extends HttpException {
  constructor(message: string = 'Authentication failed') {
    super(
      {
        errorCode: 'AUTHENTICATION_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNAUTHORIZED
    );
  }
}

export class AuthorizationError extends HttpException {
  constructor(message: string = 'Insufficient permissions') {
    super(
      {
        errorCode: 'AUTHORIZATION_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.FORBIDDEN
    );
  }
}

export class ResourceNotFoundError extends HttpException {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    
    super(
      {
        errorCode: 'RESOURCE_NOT_FOUND',
        message,
        resource,
        id,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class ConflictError extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      {
        errorCode: 'CONFLICT_ERROR',
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT
    );
  }
}

export class ExternalServiceError extends HttpException {
  constructor(service: string, message: string, originalError?: Error | unknown) {
    super(
      {
        errorCode: 'EXTERNAL_SERVICE_ERROR',
        message: `External service '${service}' error: ${message}`,
        service,
        originalError: originalError?.message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_GATEWAY
    );
  }
}

export class RateLimitError extends HttpException {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(
      {
        errorCode: 'RATE_LIMIT_ERROR',
        message,
        retryAfter,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

export class DatabaseError extends HttpException {
  constructor(operation: string, originalError: Error | unknown) {
    super(
      {
        errorCode: 'DATABASE_ERROR',
        message: `Database operation '${operation}' failed`,
        operation,
        originalError: originalError?.message,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}