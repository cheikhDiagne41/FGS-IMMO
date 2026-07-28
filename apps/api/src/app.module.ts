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
import { AttributionsModule } from './attributions/attributions.module';
import { ReportsModule } from './reports/reports.module';
import { VendeurModule } from './vendeur/vendeur.module';
import { PublicModule } from './public/public.module';
import { MessagesModule } from './messages/messages.module';
import { TropheesModule } from './trophees/trophees.module';
import { VideosAccueilModule } from './videos-accueil/videos-accueil.module';

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
    AttributionsModule,
    ReportsModule,
    VendeurModule,
    PublicModule,
    MessagesModule,
    TropheesModule,
    VideosAccueilModule,
  ],
})
export class AppModule {}
