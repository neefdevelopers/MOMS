import { SetMetadata } from '@nestjs/common';

/**
 * Mark a route as public - bypasses the global JwtAuthGuard.
 * Only use on endpoints that genuinely require no authentication (e.g. login, health).
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
