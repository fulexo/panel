import { ApiResponse, PaginatedResponse, ErrorResponse } from '../interfaces/api-response.interface';

export class ResponseUtil {
  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
    path: string = '/'
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Success',
    statusCode: number = 200,
    path: string = '/'
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static error(
    error: string,
    message: string,
    statusCode: number = 400,
    path: string = '/',
    details?: Record<string, unknown>
  ): ErrorResponse {
    return {
      success: false,
      error,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path,
      details,
    };
  }

  static created<T>(
    data: T,
    message: string = 'Created successfully',
    path: string = '/'
  ): ApiResponse<T> {
    return this.success(data, message, 201, path);
  }

  static noContent(message: string = 'No content', path: string = '/'): ApiResponse {
    return this.success(null, message, 204, path);
  }
}