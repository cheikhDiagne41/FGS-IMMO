import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartenaireDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ordre?: number;
}
