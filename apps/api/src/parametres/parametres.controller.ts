import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ParametresService } from './parametres.service';
import { CreateParametreDto, UpdateParametreDto } from './dto/parametre.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/** Réglages de la plateforme — réservés à l'administrateur. */
@ApiTags('Paramètres')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('parametres')
export class ParametresController {
  constructor(private parametresService: ParametresService) {}

  @Get()
  findAll() {
    return this.parametresService.findAll();
  }

  @Post()
  create(@Body() dto: CreateParametreDto) {
    return this.parametresService.create(dto);
  }

  @Patch(':cle')
  update(@Param('cle') cle: string, @Body() dto: UpdateParametreDto) {
    return this.parametresService.update(cle, dto);
  }

  @Delete(':cle')
  remove(@Param('cle') cle: string) {
    return this.parametresService.remove(cle);
  }
}
