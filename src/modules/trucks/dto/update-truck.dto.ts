import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateTruckDto } from './create-truck.dto';

export class UpdateTruckDto extends PartialType(CreateTruckDto) {
  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsNumber()
  capacidade?: number;

  @IsOptional()
  @IsEnum(['Disponível', 'Em uso'])
  status?: string;

  @IsOptional()
  @IsMongoId()
  entregaId?: string;
}
