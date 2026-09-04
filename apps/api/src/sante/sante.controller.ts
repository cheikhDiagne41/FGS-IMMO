import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SanteService } from './sante.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * État de santé du service.
 *
 * La sonde publique reste volontairement muette : elle répond « ok » sans
 * révéler de versions ni de détails d'infrastructure. Le diagnostic complet
 * est réservé à l'administrateur.
 */
@ApiTags('Santé')
@Controller()
export class SanteController {
  constructor(private santeService: SanteService) {}

  /** Sonde de disponibilité (hébergeur, supervision). */
  @Get('sante')
  async sonde() {
    return this.santeService.sonde();
  }

  /** Diagnostic détaillé — administrateur uniquement. */
  @Get('sante/diagnostic')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  diagnostic() {
    return this.santeService.diagnostic();
  }
}
