import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartenaireDto } from './dto/partenaire.dto';

@Injectable()
export class PartenairesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.partenaire.findMany({
      orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreatePartenaireDto, logoUrl: string) {
    return this.prisma.partenaire.create({
      data: {
        nom: dto.nom,
        siteWeb: dto.siteWeb,
        ordre: dto.ordre ?? 0,
        logoUrl,
      },
    });
  }

  async remove(id: string) {
    const partenaire = await this.prisma.partenaire.findUnique({ where: { id } });
    if (!partenaire) throw new NotFoundException('Partenaire introuvable.');
    await this.prisma.partenaire.delete({ where: { id } });
    return { ok: true };
  }
}
