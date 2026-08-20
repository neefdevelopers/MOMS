import { Controller, Post, Body, Get, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Public endpoint — issues a signed JWT access token upon valid credentials.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/v1/auth/logout
   * Requires authentication — records logout audit event.
   * Token invalidation is enforced client-side (stateless JWT architecture).
   */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  /**
   * GET /api/v1/auth/profile
   * Returns the authenticated user's full profile including role and department.
   */
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  /**
   * PATCH /api/v1/auth/change-password
   * Requires the current password to be verified before setting a new one.
   */
  @HttpCode(HttpStatus.OK)
  @Patch('change-password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
