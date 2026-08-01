import { Module } from '@nestjs/common';
import { PartenairesService } from './partenaires.service';
import { PartenairesController } from './partenaires.controller';

@Module({
  controllers: [PartenairesController],
  providers: [PartenairesService],
  exports: [PartenairesService],
})
export class PartenairesModule {}
