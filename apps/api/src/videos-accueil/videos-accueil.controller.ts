import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VideosAccueilService } from './videos-accueil.service';
import { CreateVideoAccueilDto } from './dto/video-accueil.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { videoFileFilter } from '../common/upload.util';

const UPLOAD_DIR = 'uploads/videos-accueil';

const videoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});


@ApiTags('Vidéos accueil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('videos-accueil')
export class VideosAccueilController {
  constructor(private videosAccueilService: VideosAccueilService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  findAll() {
    return this.videosAccueilService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @UseInterceptors(
    FileInterceptor('video', {
      storage: videoStorage,
      fileFilter: videoFileFilter,
      limits: { fileSize: 80 * 1024 * 1024 },
    }),
  )
  create(
    @Body() dto: CreateVideoAccueilDto,
    @UploadedFile() file: { filename: string } | undefined,
  ) {
    if (!file) throw new BadRequestException('Une vidéo est requise.');
    return this.videosAccueilService.create(dto, `/uploads/videos-accueil/${file.filename}`);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  remove(@Param('id') id: string) {
    return this.videosAccueilService.remove(id);
  }
}
