import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VendeurService } from './vendeur.service';
import { UpdateVendeurDto } from './dto/vendeur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Vendeur')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendeur')
export class VendeurController {
  constructor(private vendeurService: VendeurService) {}

  /** Liste des vendeurs */
  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  list() {
    return this.vendeurService.list();
  }

  /** Vendeur principal (société) */
  @Get('principal')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  principal() {
    return this.vendeurService.get();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: UpdateVendeurDto) {
    return this.vendeurService.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateVendeurDto) {
    return this.vendeurService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.vendeurService.remove(id);
  }
}
