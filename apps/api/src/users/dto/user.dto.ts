import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
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
