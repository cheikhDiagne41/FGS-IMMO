import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FacturesService } from './factures.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

@ApiTags('Factures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('factures')
export class FacturesController {
  constructor(private facturesService: FacturesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  findAll() {
    return this.facturesService.findAll();
  }

  @Get('mine')
  @Roles(Role.CLIENT)
  mine(@CurrentUser() user: AuthUser) {
    if (!user.clientId) throw new ForbiddenException();
    return this.facturesService.findByClient(user.clientId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.facturesService.getFullFacture(id, {
      clientId: user.clientId,
      role: user.role,
    });
  }

  @Get(':id/pdf')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  async pdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const facture = await this.facturesService.getFullFacture(id, {
      clientId: user.clientId,
      role: user.role,
    });
    const buffer = await this.facturesService.generatePdf(id, {
      clientId: user.clientId,
      role: user.role,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${facture.numero}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
