import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVendeurDto {
  @IsOptional() @IsString() nom?: string;
  @IsOptional() @IsString() raisonSociale?: string;
  @IsOptional() @IsString() slogan?: string;
  @IsOptional() @IsString() adresse?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() siteWeb?: string;
  @IsOptional() @IsString() ninea?: string;
  @IsOptional() @IsString() rccm?: string;
  @IsOptional() @IsString() responsable?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() tiktok?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() youtube?: string;
  @IsOptional() @IsString() twitter?: string;
  @IsOptional() @IsString() whatsapp?: string;
  /** Mot de passe pour créer/réinitialiser le compte de connexion du vendeur */
  @IsOptional() @IsString() motDePasse?: string;
}
