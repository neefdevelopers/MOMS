import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get()
  getRoot() {
    return {
      status: 'ok',
      service: 'MOMS Backend',
      message: 'MOMS Backend API is running',
    };
  }

  @Public()
  @Get(['health', 'api/health', 'api/v1/health'])
  getHealth() {
    return {
      status: 'ok',
      service: 'MOMS Backend',
    };
  }
}

