import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { SiteStatus } from '@prisma/client';

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

  @IsOptional() @IsEnum(SiteStatus) statut?: SiteStatus;
}

export class UpdateSiteDto extends PartialType(CreateSiteDto) {}
