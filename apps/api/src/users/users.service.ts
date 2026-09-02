import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Liste tous les comptes, sans jamais exposer les mots de passe. */
  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        client: { select: { nom: true, prenom: true, telephone: true } },
        vendeurProfil: { select: { nom: true, suspendu: true } },
        _count: { select: { paiementsSaisis: true } },
      },
    });
    return users;
  }

  /**
   * Empêche de se retrouver sans administrateur : le dernier compte ADMIN
   * actif ne peut être ni supprimé, ni désactivé, ni rétrogradé.
   */
  private async estDernierAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.ADMIN) return false;
    const nbAdmins = await this.prisma.user.count({
      where: { role: Role.ADMIN, isActive: true },
    });
    return nbAdmins <= 1;
  }

  async create(dto: CreateUserDto) {
    const existant = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existant) throw new ConflictException('Un compte existe déjà avec cet email.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Un compte client a besoin d'une fiche client rattachée
    if (dto.role === Role.CLIENT) {
      if (!dto.nom || !dto.prenom || !dto.telephone) {
        throw new BadRequestException(
          'Nom, prénom et téléphone sont requis pour un compte client.',
        );
      }
      return this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          client: {
            create: { nom: dto.nom, prenom: dto.prenom, telephone: dto.telephone },
          },
        },
        select: { id: true, email: true, role: true, isActive: true, createdAt: true },
      });
    }

    return this.prisma.user.create({
      data: { email: dto.email, passwordHash, role: dto.role },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });
  }

  async update(id: string, dto: UpdateUserDto, demandeurId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Compte introuvable.');

    if (dto.email && dto.email !== user.email) {
      const pris = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (pris) throw new ConflictException('Cet email est déjà utilisé.');
    }

    const perdSonRoleAdmin = dto.role && dto.role !== Role.ADMIN;
    const estDesactive = dto.isActive === false;
    if ((perdSonRoleAdmin || estDesactive) && (await this.estDernierAdmin(id))) {
      throw new BadRequestException(
        "Il doit rester au moins un administrateur actif : modifiez d'abord un autre compte en administrateur.",
      );
    }

    if (id === demandeurId && estDesactive) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
    }

    // Un compte client ne peut pas changer de rôle : sa fiche client en dépend
    if (dto.role && user.role === Role.CLIENT && dto.role !== Role.CLIENT) {
      throw new BadRequestException(
        "Un compte client ne peut pas changer de rôle : son dossier d'adhésion y est rattaché.",
      );
    }

    const data: any = {};
    if (dto.email) data.email = dto.email;
    if (dto.role) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });
  }

  /**
   * Supprime un compte. Les traces d'activité et les paiements saisis sont
   * conservés mais détachés : l'historique comptable ne doit jamais
   * disparaître avec un employé. La fiche vendeur est également conservée,
   * simplement privée de son accès.
   */
  async remove(id: string, demandeurId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { client: true, vendeurProfil: true },
    });
    if (!user) throw new NotFoundException('Compte introuvable.');

    if (id === demandeurId) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte.');
    }
    if (await this.estDernierAdmin(id)) {
      throw new BadRequestException(
        'Impossible de supprimer le dernier administrateur actif.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.activityLog.updateMany({ where: { userId: id }, data: { userId: null } }),
      this.prisma.paiement.updateMany({ where: { saisiParId: id }, data: { saisiParId: null } }),
      this.prisma.vendeur.updateMany({ where: { userId: id }, data: { userId: null } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return {
      ok: true,
      ficheVendeurConservee: !!user.vendeurProfil,
      dossierClientSupprime: !!user.client,
    };
  }
}
