import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class RestResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Enforce standard JSON content-type unless streaming or downloading files
    if (!response.getHeader('Content-Type')) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    return next.handle().pipe(
      map((data) => {
        // Return raw data if it's a buffer or already formatted
        return data;
      }),
    );
  }
}
