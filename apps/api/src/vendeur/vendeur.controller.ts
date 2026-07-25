import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
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

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  get() {
    return this.vendeurService.get();
  }

  @Put()
  @Roles(Role.ADMIN)
  update(@Body() dto: UpdateVendeurDto) {
    return this.vendeurService.update(dto);
  }
}
