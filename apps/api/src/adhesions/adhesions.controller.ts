import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdhesionsService } from './adhesions.service';
import { CreateAdhesionDto, PreviewAdhesionDto } from './dto/adhesion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

@ApiTags('Adhésions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('adhesions')
export class AdhesionsController {
  constructor(private adhesionsService: AdhesionsService) {}

  /** Aperçu avant validation (montant total, échéancier) */
  @Post('preview')
  @Roles(Role.CLIENT, Role.ADMIN, Role.GESTIONNAIRE)
  preview(@Body() dto: PreviewAdhesionDto) {
    return this.adhesionsService.preview(dto.cooperativeId);
  }

  /** Le client rejoint une coopérative (ou un gestionnaire inscrit un client) */
  @Post()
  @Roles(Role.CLIENT, Role.ADMIN, Role.GESTIONNAIRE)
  create(@Body() dto: CreateAdhesionDto, @CurrentUser() user: AuthUser) {
    let clientId: string | undefined;
    if (user.role === Role.CLIENT) {
      if (!user.clientId)
        throw new ForbiddenException('Aucun profil client associé.');
      clientId = user.clientId;
    } else {
      clientId = dto.clientId;
      if (!clientId)
        throw new BadRequestException(
          'clientId est requis pour inscrire un client.',
        );
    }
    return this.adhesionsService.create(clientId, dto.cooperativeId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  findAll() {
    return this.adhesionsService.findAll();
  }

  @Get('mine')
  @Roles(Role.CLIENT)
  mine(@CurrentUser() user: AuthUser) {
    if (!user.clientId)
      throw new ForbiddenException('Aucun profil client associé.');
    return this.adhesionsService.findByClient(user.clientId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adhesionsService.findOne(id, {
      clientId: user.clientId,
      role: user.role,
    });
  }
}
