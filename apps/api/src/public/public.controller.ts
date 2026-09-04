import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { MessagesService } from '../messages/messages.service';
import { ParametresService } from '../parametres/parametres.service';

/** Endpoints publics (sans authentification) pour les visiteurs */
@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private publicService: PublicService,
    private messagesService: MessagesService,
    private parametresService: ParametresService,
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
  terrains(
    @Query('q') q?: string,
    @Query('statut') statut?: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.publicService.terrains({
      q,
      statut,
      type,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
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

  @Get('partenaires')
  partenaires() {
    return this.publicService.partenaires();
  }

  @Get('gouvernance')
  gouvernance() {
    return this.publicService.gouvernance();
  }

  /** Réglages visibles par le site vitrine (interrupteurs, coordonnées…) */
  @Get('parametres')
  parametres() {
    return this.parametresService.publics();
  }

  @Get('regions')
  regions() {
    return this.publicService.regions();
  }
}
