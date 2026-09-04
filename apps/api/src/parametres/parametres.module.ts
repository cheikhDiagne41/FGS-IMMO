import { Global, Module, OnModuleInit } from '@nestjs/common';
import { ParametresController } from './parametres.controller';
import { ParametresService } from './parametres.service';
import { PrismaService } from '../prisma/prisma.service';
import { installerParametresSocle } from '../../prisma/parametres-socle';

/** Les réglages sont lisibles depuis n'importe quel module. */
@Global()
@Module({
  controllers: [ParametresController],
  providers: [ParametresService],
  exports: [ParametresService],
})
export class ParametresModule implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  /** Au démarrage, les réglages du socle absents sont créés. */
  async onModuleInit() {
    await installerParametresSocle(this.prisma);
  }
}
