import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterClientDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async signToken(user: {
    id: string;
    email: string;
    role: Role;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async register(dto: RegisterClientDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: Role.CLIENT,
        client: {
          create: {
            nom: dto.nom,
            prenom: dto.prenom,
            telephone: dto.telephone,
            sexe: dto.sexe,
            dateNaissance: dto.dateNaissance
              ? new Date(dto.dateNaissance)
              : undefined,
            cin: dto.cin,
            passeport: dto.passeport,
            adresse: dto.adresse,
            profession: dto.profession,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'INSCRIPTION',
        entite: 'Client',
        entiteId: user.id,
      },
    });

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.signToken(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: true,
        vendeurProfil: { select: { id: true, nom: true, suspendu: true } },
      },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
