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
import { TropheesService } from './trophees.service';
import { CreateTropheeDto } from './dto/trophee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { imageFileFilter } from '../common/upload.util';

const UPLOAD_DIR = 'uploads/trophees';

const imageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});


@ApiTags('Trophées')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trophees')
export class TropheesController {
  constructor(private tropheesService: TropheesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  findAll() {
    return this.tropheesService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(
    @Body() dto: CreateTropheeDto,
    @UploadedFile() file: { filename: string } | undefined,
  ) {
    if (!file) throw new BadRequestException('Une image est requise.');
    return this.tropheesService.create(dto, `/uploads/trophees/${file.filename}`);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  remove(@Param('id') id: string) {
    return this.tropheesService.remove(id);
  }
}
