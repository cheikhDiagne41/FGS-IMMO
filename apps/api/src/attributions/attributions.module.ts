import { Module } from '@nestjs/common';
import { AttributionsService } from './attributions.service';
import { AttributionsController } from './attributions.controller';
import { VendeurModule } from '../vendeur/vendeur.module';

@Module({
  imports: [VendeurModule],
  controllers: [AttributionsController],
  providers: [AttributionsService],
  exports: [AttributionsService],
})
export class AttributionsModule {}
