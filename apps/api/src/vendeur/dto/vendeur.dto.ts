import { IsOptional, IsString } from 'class-validator';

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
  /** Mot de passe pour créer/réinitialiser le compte de connexion du vendeur */
  @IsOptional() @IsString() motDePasse?: string;
}
