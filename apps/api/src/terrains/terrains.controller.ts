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
import { TerrainsService } from './terrains.service';
import {
  CreateTerrainDto,
  SearchTerrainDto,
  UpdateTerrainDto,
} from './dto/terrain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Terrains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('terrains')
export class TerrainsController {
  constructor(private terrainsService: TerrainsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  create(@Body() dto: CreateTerrainDto) {
    return this.terrainsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  search(@Query() filters: SearchTerrainDto) {
    return this.terrainsService.search(filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  findOne(@Param('id') id: string) {
    return this.terrainsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  update(@Param('id') id: string, @Body() dto: UpdateTerrainDto) {
    return this.terrainsService.update(id, dto);
  }

  @Post(':id/reserver')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  reserver(@Param('id') id: string, @Body('clientId') clientId?: string) {
    return this.terrainsService.reserver(id, clientId);
  }

  @Post(':id/liberer')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  liberer(@Param('id') id: string) {
    return this.terrainsService.liberer(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.terrainsService.remove(id);
  }
}
