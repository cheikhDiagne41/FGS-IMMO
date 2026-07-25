import { IsOptional, IsUUID } from 'class-validator';

export class PreviewAdhesionDto {
  @IsUUID('4')
  cooperativeId: string;
}

export class CreateAdhesionDto {
  @IsUUID('4')
  cooperativeId: string;

  /** Réservé aux gestionnaires : inscrire un client donné.
   *  Pour un client connecté, ce champ est ignoré (il s'inscrit lui-même). */
  @IsOptional()
  @IsUUID('4')
  clientId?: string;
}
