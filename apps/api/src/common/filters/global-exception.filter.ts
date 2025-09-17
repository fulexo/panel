import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: Record<string, unknown> | null = null;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as { message?: string; error?: string; errorCode?: string; details?: unknown };
        message = responseObj.message || responseObj.error || message;
        errorCode = responseObj.errorCode || 'HTTP_ERROR';
        details = (responseObj as Record<string, unknown>).details || null;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'DATABASE_ERROR';
      
      switch (exception.code) {
        case 'P2002':
          message = 'A record with this data already exists';
          details = { field: exception.meta?.['target'] };
          break;
        case 'P2025':
          message = 'Record not found';
          break;
        case 'P2003':
          message = 'Foreign key constraint failed';
          break;
        case 'P2014':
          message = 'The change you are trying to make would violate the required relation';
          break;
        default:
          message = 'Database operation failed';
          details = { code: exception.code };
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'VALIDATION_ERROR';
      message = 'Invalid data provided';
      details = { message: exception.message };
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      errorCode = 'DATABASE_CONNECTION_ERROR';
      message = 'Database connection failed';
    } else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'DATABASE_PANIC';
      message = 'Database engine panic';
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = 'APPLICATION_ERROR';
      
      // Handle specific error types
      if (exception.message.includes('JWT')) {
        errorCode = 'JWT_ERROR';
        status = HttpStatus.UNAUTHORIZED;
      } else if (exception.message.includes('Redis') || exception.message.includes('cache')) {
        errorCode = 'CACHE_ERROR';
        status = HttpStatus.SERVICE_UNAVAILABLE;
      } else if (exception.message.includes('CORS')) {
        errorCode = 'CORS_ERROR';
        status = HttpStatus.FORBIDDEN;
      }
    }

    // Log the error
    const errorLog = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      status,
      errorCode,
      message,
      details,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as { user?: { id?: string } }).user?.id || null,
      tenantId: (request as { tenantId?: string }).tenantId || null,
    };

    if (status >= 500) {
      this.logger.error('Server error occurred', errorLog);
    } else {
      this.logger.warn('Client error occurred', errorLog);
    }

    // Send error response
    const errorResponse = {
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && { details }),
      ...(process.env['NODE_ENV'] === 'development' && { stack: exception instanceof Error ? exception.stack : undefined }),
    };

    response.status(status).json(errorResponse);
  }
}