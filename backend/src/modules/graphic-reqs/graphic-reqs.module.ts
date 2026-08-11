import { Module } from '@nestjs/common';
import { GraphicReqsService } from './graphic-reqs.service';
import { GraphicReqsController } from './graphic-reqs.controller';

@Module({
  controllers: [GraphicReqsController],
  providers: [GraphicReqsService],
  exports: [GraphicReqsService],
})
export class GraphicReqsModule {}
