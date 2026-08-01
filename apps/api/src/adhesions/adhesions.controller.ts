import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentType, PieceType, Role } from '@prisma/client';
import { AdhesionsService, PieceIdentite } from './adhesions.service';
import { CreateAdhesionDto, PreviewAdhesionDto } from './dto/adhesion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { imageFileFilter } from '../common/upload.util';

const DOC_DIR = 'uploads/documents';
const docStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(DOC_DIR, { recursive: true });
    cb(null, DOC_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

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

  /** Adhésion du client avec pièce d'identité (CNI recto/verso, passeport ou extrait) */
  @Post('rejoindre')
  @Roles(Role.CLIENT)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'recto', maxCount: 1 },
        { name: 'verso', maxCount: 1 },
      ],
      { storage: docStorage, fileFilter: imageFileFilter, limits: { fileSize: 15 * 1024 * 1024 } },
    ),
  )
  rejoindre(
    @Body() body: { cooperativeId: string; pieceType: PieceType; pieceNumero: string },
    @UploadedFiles()
    files: { recto?: { filename: string }[]; verso?: { filename: string }[] },
    @CurrentUser() user: AuthUser,
  ) {
    if (!user.clientId) throw new ForbiddenException('Aucun profil client.');
    if (!body.cooperativeId) throw new BadRequestException('Coopérative requise.');
    if (!body.pieceType || !body.pieceNumero)
      throw new BadRequestException("Type et numéro de pièce d'identité requis.");

    const recto = files?.recto?.[0];
    const verso = files?.verso?.[0];
    const documents: PieceIdentite['documents'] = [];

    if (body.pieceType === PieceType.CNI) {
      if (!recto || !verso)
        throw new BadRequestException('CNI : photos recto ET verso requises.');
      documents.push({ type: DocumentType.CNI_RECTO, nom: 'CNI recto', url: `/uploads/documents/${recto.filename}` });
      documents.push({ type: DocumentType.CNI_VERSO, nom: 'CNI verso', url: `/uploads/documents/${verso.filename}` });
    } else {
      if (!recto)
        throw new BadRequestException(
          body.pieceType === PieceType.PASSEPORT
            ? 'Passeport : photo requise.'
            : 'Extrait : photo requise.',
        );
      const type = body.pieceType === PieceType.PASSEPORT ? DocumentType.PASSEPORT : DocumentType.EXTRAIT;
      documents.push({ type, nom: type, url: `/uploads/documents/${recto.filename}` });
    }

    return this.adhesionsService.create(user.clientId, body.cooperativeId, {
      pieceType: body.pieceType,
      pieceNumero: body.pieceNumero,
      documents,
    });
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

  /** Demandes d'adhésion en attente de validation */
  @Get('demandes')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  demandes() {
    return this.adhesionsService.findDemandes();
  }

  /** Valider une demande → dossier affecté au client */
  @Post(':id/valider')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  valider(@Param('id') id: string) {
    return this.adhesionsService.valider(id);
  }

  /** Rejeter une demande en attente */
  @Post(':id/rejeter')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  rejeter(@Param('id') id: string, @Body('motif') motif?: string) {
    return this.adhesionsService.rejeter(id, motif);
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
