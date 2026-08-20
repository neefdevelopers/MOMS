import { Module } from '@nestjs/common';
import { RecentAccessService } from './recent-access.service';
import { RecentAccessController } from './recent-access.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecentAccessController],
  providers: [RecentAccessService],
  exports: [RecentAccessService],
})
export class RecentAccessModule {}
