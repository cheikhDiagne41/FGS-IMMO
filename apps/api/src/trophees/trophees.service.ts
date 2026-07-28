import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTropheeDto } from './dto/trophee.dto';

@Injectable()
export class TropheesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.trophee.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateTropheeDto, imageUrl: string) {
    return this.prisma.trophee.create({
      data: { titre: dto.titre, description: dto.description, imageUrl },
    });
  }

  async remove(id: string) {
    const trophee = await this.prisma.trophee.findUnique({ where: { id } });
    if (!trophee) throw new NotFoundException('Trophée introuvable.');
    await this.prisma.trophee.delete({ where: { id } });
    return { ok: true };
  }
}
