import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { SiteStatus, SiteType } from '@prisma/client';

/** Configuration de la coopérative créée en même temps qu'un site coopératif */
export class CooperativeConfigDto {
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() nom?: string;

  @IsInt() @Min(1) nbMaxAdherents: number;
  @IsOptional() @IsNumber() @Min(0) fraisAdhesion?: number;
  @IsNumber() @Min(0) montantAcompte: number;
  @IsNumber() @Min(0) cotisationMensuelle: number;
  @IsInt() @Min(1) nbMensualites: number;
  @IsOptional() @IsString() responsable?: string;
}

export class CreateSiteDto {
  @IsString()
  code: string;

  @IsString()
  nom: string;

  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() departement?: string;
  @IsOptional() @IsString() commune?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsNumber() superficie?: number;

  @IsOptional() @IsInt() @Min(0) nbParcelles?: number;
  @IsOptional() @IsNumber() prixReference?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() planUrl?: string;

  @IsOptional() @IsEnum(SiteType) type?: SiteType;
  @IsOptional() @IsEnum(SiteStatus) statut?: SiteStatus;

  @IsOptional() @IsString() gerantNom?: string;
  @IsOptional() @IsString() gerantTelephone?: string;
  @IsOptional() @IsString() gerantEmail?: string;

  /** Requis si type = COOPERATIVE : paramètres de la coopérative à créer */
  @IsOptional()
  @ValidateNested()
  @Type(() => CooperativeConfigDto)
  cooperative?: CooperativeConfigDto;
}

export class UpdateSiteDto extends PartialType(CreateSiteDto) {}
