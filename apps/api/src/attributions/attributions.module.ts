import { Module } from '@nestjs/common';
import { AttributionsService } from './attributions.service';
import { AttributionsController } from './attributions.controller';

@Module({
  controllers: [AttributionsController],
  providers: [AttributionsService],
  exports: [AttributionsService],
})
export class AttributionsModule {}
