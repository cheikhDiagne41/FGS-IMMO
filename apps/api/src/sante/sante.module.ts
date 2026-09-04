import { Module } from '@nestjs/common';
import { SanteController } from './sante.controller';
import { SanteService } from './sante.service';

@Module({
  controllers: [SanteController],
  providers: [SanteService],
})
export class SanteModule {}
