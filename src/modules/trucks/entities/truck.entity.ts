import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema()
export class Truck extends Document {
  @Prop({ required: true })
  placa: string;

  @Prop({ required: true })
  modelo: string;

  @Prop({ required: true })
  capacidade: number;

  @Prop({ default: 'Disponível', enum: ['Disponível', 'Em uso'] })
  status: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    required: false,
  })
  entregaId: string;
}

export const TruckSchema = SchemaFactory.createForClass(Truck);
