import { Module } from '@nestjs/common';
import { TerrainsService } from './terrains.service';
import { TerrainsController } from './terrains.controller';
import { VendeurModule } from '../vendeur/vendeur.module';

@Module({
  imports: [VendeurModule],
  controllers: [TerrainsController],
  providers: [TerrainsService],
  exports: [TerrainsService],
})
export class TerrainsModule {}
