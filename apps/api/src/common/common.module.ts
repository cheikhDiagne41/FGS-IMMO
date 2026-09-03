import { Global, Module } from '@nestjs/common';
import { PerimetreVendeurService } from './perimetre-vendeur.service';

/** Services transverses disponibles dans toute l'application. */
@Global()
@Module({
  providers: [PerimetreVendeurService],
  exports: [PerimetreVendeurService],
})
export class CommonModule {}
