import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Driver extends Document {
  @Prop({ required: true })
  nome: string;

  @Prop({ required: true })
  cpf: string;

  @Prop({ required: true })
  telefone: string;

  @Prop({ default: 'Disponível', enum: ['Disponível', 'Indisponível'] })
  status: string;

  @Prop({ default: 0 })
  entregasNordeste: number;

  @Prop({ default: 0 })
  entregasNoMes: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    required: false,
  })
  entregaId: string;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
