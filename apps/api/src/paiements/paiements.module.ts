import { Module } from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';
import { FacturesModule } from '../factures/factures.module';

@Module({
  imports: [FacturesModule],
  controllers: [PaiementsController],
  providers: [PaiementsService],
  exports: [PaiementsService],
})
export class PaiementsModule {}
