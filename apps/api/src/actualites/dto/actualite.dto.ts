import { IsOptional, IsString } from 'class-validator';

export class CreateActualiteDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;
}
