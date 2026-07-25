import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaiementMethode } from '@prisma/client';

/** Paiement en ligne par le client (Wave / Orange Money, simulé) */
export class CreatePaiementDto {
  @IsUUID('4')
  adhesionId: string;

  @IsOptional()
  @IsUUID('4')
  echeanceId?: string;

  @IsNumber()
  @IsPositive()
  montant: number;

  @IsEnum(PaiementMethode)
  methode: PaiementMethode;

  @IsOptional()
  @IsString()
  refTransaction?: string;
}

/** Paiement manuel enregistré par le comptable (espèces, virement, chèque…) */
export class CreatePaiementManuelDto extends CreatePaiementDto {
  @IsOptional()
  @IsString()
  commentaire?: string;
}
