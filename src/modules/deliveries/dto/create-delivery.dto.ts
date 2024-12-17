import {
  IsNumber,
  IsDate,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class CreateDeliveryDto {
  @IsMongoId()
  caminhaoId: string;

  @IsMongoId()
  motoristaId: string;

  @IsString()
  tipoCarga: string;

  @IsNumber()
  valorCarga: number;

  @IsString()
  localChegada: string;

  @IsString()
  regiao: string;

  @IsEnum(['Andamento', 'Concluída', 'Removida', 'AguardandoInício'])
  status: string;

  @IsDate()
  dataInicio: Date;

  @IsDate()
  dataFim: Date;

  @IsOptional()
  @IsBoolean()
  valiosa: boolean;

  @IsOptional()
  @IsBoolean()
  temSeguro: boolean;

  @IsOptional()
  @IsBoolean()
  cargaPerigosa: boolean;
}
