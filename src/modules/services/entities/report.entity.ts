import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { IsBoolean } from 'class-validator';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  image: string;

  @IsBoolean()
  @Prop({
    default: true,
  })
  isActive: boolean;

  @Prop({
    default: 'usuárioteste@gmail.com',
  })
  createdBy: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
