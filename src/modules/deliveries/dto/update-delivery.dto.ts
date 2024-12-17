import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryDto } from './create-delivery.dto';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {
  @IsOptional()
  @IsMongoId()
  caminhaoId?: string;

  @IsOptional()
  @IsMongoId()
  motoristaId?: string;

  @IsEnum(['Eletrônicos', 'Combustível'])
  @IsOptional()
  tipoCarga?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorCarga?: number;

  @IsOptional()
  @IsString()
  localChegada?: string;

  @IsOptional()
  @IsString()
  regiao?: string;

  @IsOptional()
  @IsEnum(['Andamento', 'Concluída', 'Removida', 'AguardandoInício'])
  status?: string;

  @IsOptional()
  @IsDate()
  dataInicio?: Date;

  @IsOptional()
  @IsDate()
  dataFim?: Date;

  @IsOptional()
  @IsBoolean()
  valiosa?: boolean; // Este campo será definido automaticamente no service, mas pode ser sobrescrito.

  @IsOptional()
  @IsBoolean()
  temSeguro?: boolean; // Este campo será definido automaticamente no service, mas pode ser sobrescrito.

  @IsOptional()
  @IsBoolean()
  cargaPerigosa?: boolean; // Este campo será definido automaticamente no service, mas pode ser sobrescrito.
}
