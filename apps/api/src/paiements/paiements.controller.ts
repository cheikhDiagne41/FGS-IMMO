import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaiementMethode, PaiementStatut, Role } from '@prisma/client';
import { PaiementsService } from './paiements.service';
import {
  CreatePaiementDto,
  CreatePaiementManuelDto,
} from './dto/paiement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

@ApiTags('Paiements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('paiements')
export class PaiementsController {
  constructor(private paiementsService: PaiementsService) {}

  /** Paiement en ligne (Wave / Orange Money) par le client — validé immédiatement (simulation) */
  @Post()
  @Roles(Role.CLIENT, Role.ADMIN, Role.GESTIONNAIRE)
  create(@Body() dto: CreatePaiementDto, @CurrentUser() user: AuthUser) {
    return this.paiementsService.create(dto, {
      statut: PaiementStatut.VALIDE,
      requesterClientId: user.clientId,
      requesterRole: user.role,
      saisiParId: user.userId,
    });
  }

  /** Achat direct d'une parcelle (site en vente directe) — paiement unique */
  @Post('achat-direct/:terrainId')
  @Roles(Role.CLIENT, Role.ADMIN, Role.GESTIONNAIRE)
  acheterDirect(
    @Param('terrainId') terrainId: string,
    @Body() body: { montant: number; methode: PaiementMethode; refTransaction?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.paiementsService.acheterTerrainDirect(terrainId, body, {
      requesterClientId: user.clientId,
      requesterRole: user.role,
      saisiParId: user.userId,
    });
  }

  /** Enregistrement d'un paiement manuel par le comptable (en attente de confirmation) */
  @Post('manuel')
  @Roles(Role.COMPTABLE, Role.ADMIN)
  createManuel(
    @Body() dto: CreatePaiementManuelDto,
    @CurrentUser() user: AuthUser,
  ) {
    const enLigne =
      dto.methode === PaiementMethode.WAVE ||
      dto.methode === PaiementMethode.ORANGE_MONEY;
    return this.paiementsService.create(dto, {
      statut: enLigne ? PaiementStatut.VALIDE : PaiementStatut.EN_ATTENTE,
      requesterRole: user.role,
      saisiParId: user.userId,
      commentaire: dto.commentaire,
    });
  }

  @Post(':id/confirmer')
  @Roles(Role.COMPTABLE, Role.ADMIN)
  confirmer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.paiementsService.confirmer(id, user.userId);
  }

  @Post(':id/annuler')
  @Roles(Role.COMPTABLE, Role.ADMIN)
  annuler(@Param('id') id: string) {
    return this.paiementsService.annuler(id);
  }

  @Post(':id/rembourser')
  @Roles(Role.COMPTABLE, Role.ADMIN)
  rembourser(@Param('id') id: string) {
    return this.paiementsService.rembourser(id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  findAll(@Query('statut') statut?: PaiementStatut) {
    return this.paiementsService.findAll(statut);
  }

  @Get('mine')
  @Roles(Role.CLIENT)
  mine(@CurrentUser() user: AuthUser) {
    return this.paiementsService.findByClient(user.clientId!);
  }
}
