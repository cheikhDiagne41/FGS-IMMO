import { Module } from '@nestjs/common';
import { ActualitesService } from './actualites.service';
import { ActualitesController } from './actualites.controller';

@Module({
  controllers: [ActualitesController],
  providers: [ActualitesService],
  exports: [ActualitesService],
})
export class ActualitesModule {}
