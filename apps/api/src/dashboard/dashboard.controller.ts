import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';

@ApiTags('Tableau de bord')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  adminStats() {
    return this.dashboardService.adminStats();
  }

  @Get('ventes')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  ventes() {
    return this.dashboardService.ventesParMois();
  }

  @Get('cotisations')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  cotisations() {
    return this.dashboardService.cotisationsParMois();
  }

  @Get('client')
  @Roles(Role.CLIENT)
  clientDashboard(@CurrentUser() user: AuthUser) {
    if (!user.clientId) {
      throw new ForbiddenException('Aucun profil client associé.');
    }
    return this.dashboardService.clientDashboard(user.clientId);
  }

  @Get('mes-acquisitions')
  @Roles(Role.CLIENT)
  mesAcquisitions(@CurrentUser() user: AuthUser) {
    if (!user.clientId) {
      throw new ForbiddenException('Aucun profil client associé.');
    }
    return this.dashboardService.mesAcquisitionsDirectes(user.clientId);
  }
}
