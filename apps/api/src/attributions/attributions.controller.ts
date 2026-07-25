import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AttributionsService } from './attributions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

@ApiTags('Attributions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attributions')
export class AttributionsController {
  constructor(private attributionsService: AttributionsService) {}

  /** Attribution manuelle par un gestionnaire (parcelle optionnelle) */
  @Post(':adhesionId/attribuer')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  attribuer(
    @Param('adhesionId') adhesionId: string,
    @Body('terrainId') terrainId?: string,
  ) {
    return this.attributionsService.attribuerManuel(adhesionId, terrainId);
  }

  /** Certificat d'attribution (PDF) */
  @Get(':adhesionId/certificat')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  async certificat(
    @Param('adhesionId') adhesionId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { buffer, numero } =
      await this.attributionsService.genererCertificatPdf(adhesionId, {
        clientId: user.clientId,
        role: user.role,
      });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${numero}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
