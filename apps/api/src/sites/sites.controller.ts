import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { SitesService } from './sites.service';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { imageFileFilter } from '../common/upload.util';

const SITE_UPLOAD_DIR = 'uploads/sites';
const sitePhotoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(SITE_UPLOAD_DIR, { recursive: true });
    cb(null, SITE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SitesController {
  constructor(private sitesService: SitesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  findAll() {
    return this.sitesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  findOne(@Param('id') id: string) {
    return this.sitesService.findOne(id);
  }

  @Get(':id/parcelles')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT)
  parcelles(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sitesService.parcelles(id, user.clientId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  update(@Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(id, dto);
  }

  @Post(':id/media')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: sitePhotoStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  addPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Array<{ filename: string }>,
  ) {
    return this.sitesService.addPhotos(id, files);
  }

  @Delete('photo/:photoId')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  removePhoto(@Param('photoId') photoId: string) {
    return this.sitesService.removePhoto(photoId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.sitesService.remove(id);
  }
}
