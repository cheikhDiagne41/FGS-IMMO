import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

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

  /** Profil du vendeur connecté */
  @Get('moi')
  @Roles(Role.VENDEUR)
  async moi(@CurrentUser() user: AuthUser) {
    const v = await this.vendeurService.byUser(user.userId);
    if (!v) throw new ForbiddenException('Aucun profil vendeur associé.');
    return v;
  }

  /** Suspendre / réactiver un vendeur (admin) */
  @Put(':id/suspendre')
  @Roles(Role.ADMIN)
  suspendre(@Param('id') id: string, @Body('suspendu') suspendu: boolean) {
    return this.vendeurService.setSuspendu(id, suspendu !== false);
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
