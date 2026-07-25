import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { TerrainStatus, TerrainType } from '@prisma/client';

export class CreateTerrainDto {
  @IsString()
  numeroParcelle: string;

  @IsUUID('4')
  siteId: string;

  @IsNumber()
  @Min(0)
  superficie: number;

  @IsOptional() @IsNumber() @Min(0) prix?: number;
  @IsOptional() @IsEnum(TerrainType) type?: TerrainType;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() planUrl?: string;
  @IsOptional() @IsEnum(TerrainStatus) statut?: TerrainStatus;
}

export class UpdateTerrainDto extends PartialType(CreateTerrainDto) {}

/** Filtres de recherche multicritère */
export class SearchTerrainDto {
  @IsOptional() @IsUUID('4') siteId?: string;
  @IsOptional() @IsEnum(TerrainStatus) statut?: TerrainStatus;
  @IsOptional() @IsEnum(TerrainType) type?: TerrainType;

  @IsOptional() @Type(() => Number) @IsNumber() prixMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() prixMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() superficieMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() superficieMax?: number;
}
