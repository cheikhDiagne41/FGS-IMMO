import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateSiteDto) {
    return this.prisma.site.create({ data: dto });
  }

  findAll() {
    return this.prisma.site.findMany({
      include: {
        photos: true,
        _count: { select: { cooperatives: true, terrains: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        photos: true,
        cooperatives: true,
        terrains: true,
      },
    });
    if (!site) throw new NotFoundException('Site introuvable.');
    return site;
  }

  async update(id: string, dto: UpdateSiteDto) {
    await this.findOne(id);
    return this.prisma.site.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.site.delete({ where: { id } });
  }
}
