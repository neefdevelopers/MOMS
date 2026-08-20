import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface StandardErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  error: string;
  message: string | string[];
  remediation?: string;
  details?: any;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An internal operational error occurred.';
    let errorName = 'InternalServerError';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        details = resObj.details || null;
      }

      // Classify error into 9 standardized operational categories
      if (status === HttpStatus.UNAUTHORIZED) {
        errorName = 'AuthenticationError';
      } else if (status === HttpStatus.FORBIDDEN) {
        errorName = 'AuthorizationError';
      } else if (status === HttpStatus.BAD_REQUEST) {
        if (Array.isArray(message) || (typeof message === 'string' && (message.includes('must') || message.includes('should') || message.includes('required')))) {
          errorName = 'ValidationError';
        } else {
          errorName = 'BusinessRuleViolation';
        }
      } else if (status === HttpStatus.CONFLICT) {
        errorName = 'BusinessRuleViolation';
      } else if (status === HttpStatus.PAYLOAD_TOO_LARGE || (typeof message === 'string' && message.includes('file'))) {
        errorName = 'FileStorageError';
      } else {
        errorName = 'BusinessRuleViolation';
      }
    } else if (exception instanceof Error) {
      // Log full stack trace internally for developers/monitoring
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);

      const msg = exception.message || '';
      if (exception.name.includes('Prisma') || msg.includes('prisma') || msg.includes('database')) {
        message = 'A database communication error occurred while processing your request.';
        errorName = 'DatabaseError';
      } else if (msg.includes('multer') || msg.includes('ENOENT') || msg.includes('file')) {
        message = 'A file storage operation error occurred.';
        errorName = 'FileStorageError';
      } else if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
        message = 'A network connection failure occurred.';
        errorName = 'NetworkError';
      } else if (msg.includes('weather') || msg.includes('external')) {
        message = 'An external service communication error occurred.';
        errorName = 'ExternalServiceError';
      } else {
        message = 'An unexpected internal system error occurred.';
        errorName = 'SystemError';
      }
    }

    // Determine user-friendly corrective action guidance
    let remediation = 'Please refresh the page and try again.';
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        remediation = 'Your session may have expired. Please log in again with valid credentials.';
        break;
      case HttpStatus.FORBIDDEN:
        remediation = 'You do not have permission for this action. Contact your Media Manager to request access.';
        break;
      case HttpStatus.BAD_REQUEST:
        remediation = 'Please review your input values and correct any invalid or missing fields.';
        break;
      case HttpStatus.NOT_FOUND:
        remediation = 'The requested record could not be found. Verify the ID or return to the module page.';
        break;
      case HttpStatus.CONFLICT:
        remediation = 'A record with these details already exists. Please use a unique name, code, or email.';
        break;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        remediation = 'The system encountered an error. If this persists, notify your Media Operations Administrator.';
        break;
    }

    // Extract structured audit logging fields
    const reqUser = (request as any).user;
    const userIdentifier = reqUser ? `${reqUser.name} (${reqUser.id} - ${reqUser.role})` : 'Anonymous';
    const reqId = (request.headers['x-request-id'] as string) || `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const moduleName = (request.originalUrl || request.url).split('/')[3]?.toUpperCase() || 'CORE';
    const timestampStr = new Date().toISOString();
    const techDetails = exception instanceof Error ? exception.stack || exception.message : JSON.stringify(exception);

    // Record structured technical log entry for administrators
    this.logger.error(
      `SYSTEM LOG ENTRY [${errorName}] | Time: ${timestampStr} | Module: ${moduleName} | User: ${userIdentifier} | ReqID: ${reqId} | Summary: ${Array.isArray(message) ? message.join('; ') : message} | Details: ${techDetails}`,
    );

    const errorPayload: StandardErrorResponse = {
      statusCode: status,
      timestamp: timestampStr,
      path: request.originalUrl || request.url,
      method: request.method,
      error: errorName,
      message,
      remediation,
      ...(details ? { details } : {}),
    };

    response.status(status).json(errorPayload);
  }
}
