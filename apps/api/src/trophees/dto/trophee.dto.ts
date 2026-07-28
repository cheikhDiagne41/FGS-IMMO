import { IsOptional, IsString } from 'class-validator';

export class CreateTropheeDto {
  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;
}
