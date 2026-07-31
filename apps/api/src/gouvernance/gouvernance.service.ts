import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembreDto } from './dto/membre.dto';

@Injectable()
export class GouvernanceService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.membreGouvernance.findMany({
      orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateMembreDto, photoUrl?: string) {
    return this.prisma.membreGouvernance.create({
      data: {
        nom: dto.nom,
        poste: dto.poste,
        biographie: dto.biographie,
        ordre: dto.ordre ?? 0,
        photoUrl,
      },
    });
  }

  async remove(id: string) {
    const membre = await this.prisma.membreGouvernance.findUnique({ where: { id } });
    if (!membre) throw new NotFoundException('Membre introuvable.');
    await this.prisma.membreGouvernance.delete({ where: { id } });
    return { ok: true };
  }
}
