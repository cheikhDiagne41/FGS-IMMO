import { Module } from '@nestjs/common';
import { VendeurService } from './vendeur.service';
import { VendeurController } from './vendeur.controller';

@Module({
  controllers: [VendeurController],
  providers: [VendeurService],
  exports: [VendeurService],
})
export class VendeurModule {}
