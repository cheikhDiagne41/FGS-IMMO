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
import { GouvernanceService } from './gouvernance.service';
import { CreateMembreDto } from './dto/membre.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const UPLOAD_DIR = 'uploads/gouvernance';

const photoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const photoFilter = (
  _req: any,
  file: { mimetype: string },
  cb: (err: Error | null, ok: boolean) => void,
) => {
  const ok = file.mimetype.startsWith('image/');
  cb(ok ? null : new BadRequestException('Seules les images sont acceptées.'), ok);
};

@ApiTags('Gouvernance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gouvernance')
export class GouvernanceController {
  constructor(private gouvernanceService: GouvernanceService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  findAll() {
    return this.gouvernanceService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: photoStorage,
      fileFilter: photoFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(
    @Body() dto: CreateMembreDto,
    @UploadedFile() file: { filename: string } | undefined,
  ) {
    return this.gouvernanceService.create(
      dto,
      file ? `/uploads/gouvernance/${file.filename}` : undefined,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  remove(@Param('id') id: string) {
    return this.gouvernanceService.remove(id);
  }
}
