import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SitesModule } from './sites/sites.module';
import { CooperativesModule } from './cooperatives/cooperatives.module';
import { TerrainsModule } from './terrains/terrains.module';
import { AdhesionsModule } from './adhesions/adhesions.module';
import { FacturesModule } from './factures/factures.module';
import { PaiementsModule } from './paiements/paiements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    SitesModule,
    CooperativesModule,
    TerrainsModule,
    AdhesionsModule,
    FacturesModule,
    PaiementsModule,
  ],
})
export class AppModule {}
