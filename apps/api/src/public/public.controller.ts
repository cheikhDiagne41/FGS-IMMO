import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';

/** Endpoints publics (sans authentification) pour les visiteurs */
@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('sites')
  sites() {
    return this.publicService.sites();
  }

  @Get('sites/:id')
  site(@Param('id') id: string) {
    return this.publicService.site(id);
  }

  @Get('cooperatives')
  cooperatives() {
    return this.publicService.cooperatives();
  }

  @Get('terrains')
  terrains() {
    return this.publicService.terrains();
  }

  @Get('terrains/:id')
  terrain(@Param('id') id: string) {
    return this.publicService.terrain(id);
  }

  @Get('map')
  map() {
    return this.publicService.map();
  }
}
