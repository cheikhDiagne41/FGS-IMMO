import { Module } from '@nestjs/common';
import { TropheesService } from './trophees.service';
import { TropheesController } from './trophees.controller';

@Module({
  controllers: [TropheesController],
  providers: [TropheesService],
  exports: [TropheesService],
})
export class TropheesModule {}
