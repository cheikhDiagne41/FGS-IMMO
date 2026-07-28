import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ActualitesService } from './actualites.service';
import { CreateActualiteDto } from './dto/actualite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const UPLOAD_DIR = 'uploads/actualites';

const mediaStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const mediaFilter = (
  _req: any,
  file: { mimetype: string },
  cb: (err: Error | null, ok: boolean) => void,
) => {
  const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
  cb(ok ? null : new BadRequestException('Seuls images et vidéos sont acceptés.'), ok);
};

@ApiTags('Actualités')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('actualites')
export class ActualitesController {
  constructor(private actualitesService: ActualitesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  findAll() {
    return this.actualitesService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  create(@Body() dto: CreateActualiteDto) {
    return this.actualitesService.create(dto);
  }

  /** Upload d'images / vidéos pour une actualité (max 10 fichiers, 80 Mo chacun) */
  @Post(':id/media')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: mediaStorage,
      fileFilter: mediaFilter,
      limits: { fileSize: 80 * 1024 * 1024 },
    }),
  )
  addMedia(
    @Param('id') id: string,
    @UploadedFiles() files: Array<{ filename: string; mimetype: string }>,
  ) {
    return this.actualitesService.addMedia(id, files);
  }

  @Delete('media/:mediaId')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  removeMedia(@Param('mediaId') mediaId: string) {
    return this.actualitesService.removeMedia(mediaId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  remove(@Param('id') id: string) {
    return this.actualitesService.remove(id);
  }
}
