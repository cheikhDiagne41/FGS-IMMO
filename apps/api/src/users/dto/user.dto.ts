import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email invalide.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  password: string;

  @IsEnum(Role, { message: 'Rôle invalide.' })
  role: Role;

  /** Renseignés uniquement pour un compte client */
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() prenom?: string;
  @IsOptional() @IsString() telephone?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsEmail({}, { message: 'Email invalide.' }) email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  password?: string;

  @IsOptional() @IsEnum(Role, { message: 'Rôle invalide.' }) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Rôles que l'import peut créer : jamais d'administrateur en lot. */
export const ROLES_IMPORTABLES = [
  Role.CLIENT,
  Role.VENDEUR,
  Role.GESTIONNAIRE,
  Role.COMPTABLE,
] as const;

export class LigneImportDto {
  @IsEmail({}, { message: 'Email invalide.' })
  email: string;

  @IsEnum(Role, { message: 'Rôle invalide.' })
  role: Role;

  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() prenom?: string;
  @IsOptional() @IsString() telephone?: string;
  /** Nom commercial d'un vendeur (sinon « prénom nom ») */
  @IsOptional() @IsString() societe?: string;

  /**
   * Mot de passe imposé ; sinon un mot de passe temporaire est généré.
   * Une colonne laissée vide dans le fichier vaut « non renseigné ».
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  motDePasse?: string;
}

export class ImportUsersDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Aucune ligne à importer.' })
  @ArrayMaxSize(500, { message: 'Import limité à 500 comptes à la fois.' })
  @ValidateNested({ each: true })
  @Type(() => LigneImportDto)
  comptes: LigneImportDto[];
}
