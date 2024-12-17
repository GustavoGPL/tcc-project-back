import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsMongoId()
  entregaId?: string;
}
