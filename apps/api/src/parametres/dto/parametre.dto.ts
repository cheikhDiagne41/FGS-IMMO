import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TypeParametre } from '@prisma/client';

export class CreateParametreDto {
  @IsString() @MaxLength(64) cle: string;
  @IsString() @MaxLength(500) valeur: string;
  @IsString() @MaxLength(120) libelle: string;

  @IsOptional() @IsEnum(TypeParametre) type?: TypeParametre;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsString() @MaxLength(60) groupe?: string;
  @IsOptional() @IsBoolean() public?: boolean;
  @IsOptional() @IsInt() ordre?: number;
}

export class UpdateParametreDto {
  @IsOptional() @IsString() @MaxLength(500) valeur?: string;
  @IsOptional() @IsString() @MaxLength(120) libelle?: string;
  @IsOptional() @IsEnum(TypeParametre) type?: TypeParametre;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsString() @MaxLength(60) groupe?: string;
  @IsOptional() @IsBoolean() public?: boolean;
  @IsOptional() @IsInt() ordre?: number;
}
