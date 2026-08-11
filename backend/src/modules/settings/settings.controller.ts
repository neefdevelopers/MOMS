import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put('system')
  updateSetting(@Body('key') key: string, @Body('value') value: string) {
    return this.settingsService.updateSetting(key, value);
  }

  @Roles(Role.MEDIA_MANAGER)
  @Put('formula/:id')
  updateFormula(@Param('id') id: string, @Body('outputValue') outputValue: number) {
    return this.settingsService.updateFormula(id, outputValue);
  }
}
