import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService, ReportType } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const TYPES: ReportType[] = [
  'encaissements',
  'clients',
  'cooperatives',
  'sites',
  'retards',
  'paiements',
  'factures',
  'ventes',
  'comptabilite',
];

@ApiTags('Rapports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rapports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /** Aperçu JSON d'un rapport (pour l'affichage web avant export) */
  @Get(':type')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  preview(
    @Param('type') type: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!TYPES.includes(type as ReportType)) {
      throw new BadRequestException('Type de rapport inconnu.');
    }
    return this.reportsService.buildReportData(type as ReportType, { from, to });
  }

  /** Export PDF ou Excel */
  @Get(':type/export')
  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.COMPTABLE)
  async export(
    @Param('type') type: string,
    @Res() res: Response,
    @Query('format') format: 'pdf' | 'excel' = 'pdf',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!TYPES.includes(type as ReportType)) {
      throw new BadRequestException('Type de rapport inconnu.');
    }
    const fmt = format === 'excel' ? 'excel' : 'pdf';
    const { buffer, filename, mime } = await this.reportsService.generate(
      type as ReportType,
      fmt,
      { from, to },
    );
    res.set({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
