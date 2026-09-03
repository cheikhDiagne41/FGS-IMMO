import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CooperativesService } from './cooperatives.service';
import {
  CreateCooperativeDto,
  UpdateCooperativeDto,
} from './dto/cooperative.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Coopératives')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cooperatives')
export class CooperativesController {
  constructor(private cooperativesService: CooperativesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.VENDEUR)
  create(@Body() dto: CreateCooperativeDto, @CurrentUser() user: AuthUser) {
    return this.cooperativesService.create(dto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT, Role.VENDEUR)
  findAll(@CurrentUser() user: AuthUser, @Query('siteId') siteId?: string) {
    return this.cooperativesService.findAll(siteId, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT, Role.VENDEUR)
  findOne(@Param('id') id: string) {
    return this.cooperativesService.findOne(id);
  }

  @Get(':id/disponibilite')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT, Role.VENDEUR)
  disponibilite(@Param('id') id: string) {
    return this.cooperativesService.checkDisponibilite(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.VENDEUR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCooperativeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cooperativesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.VENDEUR)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.cooperativesService.remove(id, user);
  }
}
