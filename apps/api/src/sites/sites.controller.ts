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
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.VENDEUR)
  create(@Body() dto: CreateSiteDto, @CurrentUser() user: AuthUser) {
    return this.sitesService.create(dto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT, Role.VENDEUR)
  findAll(@CurrentUser() user: AuthUser) {
    return this.sitesService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT, Role.VENDEUR)
  findOne(@Param('id') id: string) {
    return this.sitesService.findOne(id);
  }

  @Get(':id/parcelles')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE, Role.CLIENT, Role.VENDEUR)
  parcelles(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sitesService.parcelles(id, user.clientId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.VENDEUR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.sitesService.update(id, dto, user);
  }

  @Post(':id/media')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.VENDEUR)
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
    @CurrentUser() user: AuthUser,
  ) {
    return this.sitesService.addPhotos(id, files, user);
  }

  @Delete('photo/:photoId')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.VENDEUR)
  removePhoto(@Param('photoId') photoId: string, @CurrentUser() user: AuthUser) {
    return this.sitesService.removePhoto(photoId, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.VENDEUR)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sitesService.remove(id, user);
  }
}
