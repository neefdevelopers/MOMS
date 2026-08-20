import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: any) {
    return this.settingsService.getSettings(user);
  }

  @Get('default-page-size')
  async getDefaultPageSize() {
    const size = await this.settingsService.getDefaultPageSize();
    return { defaultPageSize: size };
  }

  @Get('health')
  getHealthCheck() {
    return this.settingsService.getHealthCheck();
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put('system')
  updateSetting(
    @Body('key') key: string,
    @Body('value') value: string,
    @Body('description') description?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.settingsService.updateSetting(key, value, description, userId);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put('formula/:id')
  updateFormula(
    @Param('id') id: string,
    @Body('outputValue') outputValue: number,
    @CurrentUser('id') userId?: string,
  ) {
    return this.settingsService.updateFormula(id, outputValue, userId);
  }
}
