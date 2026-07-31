import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMembreDto {
  @IsString()
  nom: string;

  @IsString()
  poste: string;

  @IsOptional()
  @IsString()
  biographie?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ordre?: number;
}
