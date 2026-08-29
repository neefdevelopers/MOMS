import { Module } from '@nestjs/common';
import { RevisionsController } from './revisions.controller';
import { RevisionsService } from './revisions.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RevisionsController],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
