import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { TerrainsService } from './terrains.service';
import {
  CreateTerrainDto,
  SearchTerrainDto,
  UpdateTerrainDto,
} from './dto/terrain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const UPLOAD_DIR = 'uploads/terrains';

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
  const ok =
    file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
  cb(ok ? null : new BadRequestException('Seuls images et vidéos sont acceptés.'), ok);
};

@ApiTags('Terrains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('terrains')
export class TerrainsController {
  constructor(private terrainsService: TerrainsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  create(@Body() dto: CreateTerrainDto) {
    return this.terrainsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  search(@Query() filters: SearchTerrainDto) {
    return this.terrainsService.search(filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  findOne(@Param('id') id: string) {
    return this.terrainsService.detail(id);
  }

  /** Upload d'images / vidéos pour un terrain (max 10 fichiers, 50 Mo chacun) */
  @Post(':id/media')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: mediaStorage,
      fileFilter: mediaFilter,
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  addMedia(
    @Param('id') id: string,
    @UploadedFiles() files: Array<{ filename: string; mimetype: string }>,
  ) {
    return this.terrainsService.addMedia(id, files);
  }

  @Delete('media/:mediaId')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  removeMedia(@Param('mediaId') mediaId: string) {
    return this.terrainsService.removeMedia(mediaId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  update(@Param('id') id: string, @Body() dto: UpdateTerrainDto) {
    return this.terrainsService.update(id, dto);
  }

  @Post(':id/reserver')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  reserver(@Param('id') id: string, @Body('clientId') clientId?: string) {
    return this.terrainsService.reserver(id, clientId);
  }

  @Post(':id/liberer')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  liberer(@Param('id') id: string) {
    return this.terrainsService.liberer(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.terrainsService.remove(id);
  }
}
