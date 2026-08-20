import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Skip authentication for routes decorated with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      throw err;
    }
    if (!user) {
      let message = 'Authentication required. Please provide a valid Bearer token.';
      if (info?.name === 'TokenExpiredError') {
        message = 'Authentication token has expired. Please log in again.';
      } else if (info?.name === 'JsonWebTokenError') {
        message = 'Authentication token is invalid or malformed.';
      } else if (info?.name === 'NotBeforeError') {
        message = 'Authentication token is not yet active.';
      } else if (info?.message === 'No auth token') {
        message = 'Authentication token missing. Include Authorization: Bearer <token> header.';
      }
      throw new UnauthorizedException(message);
    }
    return user;
  }
}

