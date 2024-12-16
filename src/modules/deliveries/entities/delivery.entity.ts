import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty } from 'class-validator';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Delivery extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Truck', required: true })
  caminhaoId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true })
  motoristaId: string;

  @Prop({ enum: ['Eletrônicos', 'Combustível'], required: true })
  @IsNotEmpty()
  tipoCarga: string;

  @Prop({ required: true })
  valorCarga: number;

  @Prop({ required: true })
  localChegada: string;

  @Prop({ required: true })
  regiao: string;

  @Prop({ default: 'Pendente', enum: ['Pendente', 'Concluída'] })
  status: string;

  @Prop({ required: true })
  dataInicio: Date;

  @Prop({ required: true })
  dataFim: Date;

  @Prop({ default: false })
  valiosa: boolean;

  @Prop({ default: false })
  temSeguro: boolean;

  @Prop({ default: false })
  cargaPerigosa: boolean;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);
