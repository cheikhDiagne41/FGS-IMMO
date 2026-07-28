import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActualiteDto } from './dto/actualite.dto';

@Injectable()
export class ActualitesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.actualite.findMany({
      include: { medias: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const actu = await this.prisma.actualite.findUnique({
      where: { id },
      include: { medias: true },
    });
    if (!actu) throw new NotFoundException('Actualité introuvable.');
    return actu;
  }

  create(dto: CreateActualiteDto) {
    return this.prisma.actualite.create({
      data: { titre: dto.titre, description: dto.description },
      include: { medias: true },
    });
  }

  async addMedia(
    actualiteId: string,
    files: Array<{ filename: string; mimetype: string }>,
  ) {
    await this.findOne(actualiteId);
    if (!files?.length) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    await this.prisma.actualiteMedia.createMany({
      data: files.map((f) => ({
        actualiteId,
        url: `/uploads/actualites/${f.filename}`,
        mediaType: f.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE',
      })),
    });
    return this.findOne(actualiteId);
  }

  async removeMedia(mediaId: string) {
    const media = await this.prisma.actualiteMedia.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('Média introuvable.');
    await this.prisma.actualiteMedia.delete({ where: { id: mediaId } });
    return { ok: true };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.actualite.delete({ where: { id } });
    return { ok: true };
  }
}
