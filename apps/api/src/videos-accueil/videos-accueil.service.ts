import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoAccueilDto } from './dto/video-accueil.dto';

@Injectable()
export class VideosAccueilService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.videoAccueil.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateVideoAccueilDto, videoUrl: string) {
    return this.prisma.videoAccueil.create({
      data: { titre: dto.titre, videoUrl },
    });
  }

  async remove(id: string) {
    const video = await this.prisma.videoAccueil.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Vidéo introuvable.');
    await this.prisma.videoAccueil.delete({ where: { id } });
    return { ok: true };
  }
}
