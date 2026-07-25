import { Module } from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';
import { FacturesModule } from '../factures/factures.module';
import { AttributionsModule } from '../attributions/attributions.module';

@Module({
  imports: [FacturesModule, AttributionsModule],
  controllers: [PaiementsController],
  providers: [PaiementsService],
  exports: [PaiementsService],
})
export class PaiementsModule {}
