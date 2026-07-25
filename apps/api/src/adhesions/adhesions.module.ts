import { Module } from '@nestjs/common';
import { AdhesionsService } from './adhesions.service';
import { AdhesionsController } from './adhesions.controller';

@Module({
  controllers: [AdhesionsController],
  providers: [AdhesionsService],
  exports: [AdhesionsService],
})
export class AdhesionsModule {}
