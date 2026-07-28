import { IsOptional, IsString } from 'class-validator';

export class CreateVideoAccueilDto {
  @IsOptional()
  @IsString()
  titre?: string;
}
