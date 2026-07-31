import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { MessagesService } from '../messages/messages.service';

/** Endpoints publics (sans authentification) pour les visiteurs */
@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private publicService: PublicService,
    private messagesService: MessagesService,
  ) {}

  /** Un visiteur envoie un message au vendeur d'une annonce */
  @Post('terrains/:id/message')
  message(
    @Param('id') id: string,
    @Body() body: { nom?: string; telephone?: string; email?: string; contenu?: string },
  ) {
    if (!body?.nom || !body?.contenu) {
      throw new BadRequestException('Nom et message sont requis.');
    }
    return this.messagesService.envoyer({
      terrainId: id,
      nom: body.nom,
      telephone: body.telephone,
      email: body.email,
      contenu: body.contenu,
    });
  }

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

  @Get('stats')
  stats() {
    return this.publicService.stats();
  }

  @Get('trophees')
  trophees() {
    return this.publicService.trophees();
  }

  @Get('videos-accueil')
  videosAccueil() {
    return this.publicService.videosAccueil();
  }

  @Get('actualites')
  actualites() {
    return this.publicService.actualites();
  }

  @Get('societe')
  societe() {
    return this.publicService.societe();
  }

  @Get('regions')
  regions() {
    return this.publicService.regions();
  }
}
