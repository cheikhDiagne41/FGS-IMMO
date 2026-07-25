import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CooperativeStatus } from '@prisma/client';

export class CreateCooperativeDto {
  @IsString()
  numero: string;

  @IsString()
  nom: string;

  @IsUUID('4', { message: 'Une coopérative doit être rattachée à un site valide.' })
  siteId: string;

  @IsInt()
  @Min(1)
  nbMaxAdherents: number;

  @IsOptional() @IsNumber() @Min(0) fraisAdhesion?: number;

  @IsNumber()
  @Min(0)
  montantAcompte: number;

  @IsNumber()
  @Min(0)
  cotisationMensuelle: number;

  @IsInt()
  @Min(1)
  nbMensualites: number;

  @IsOptional() @IsInt() @Min(1) dureeRemboursement?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() responsable?: string;
  @IsOptional() @IsEnum(CooperativeStatus) statut?: CooperativeStatus;
}

export class UpdateCooperativeDto extends PartialType(CreateCooperativeDto) {}
