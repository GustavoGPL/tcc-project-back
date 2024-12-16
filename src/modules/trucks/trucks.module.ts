import { Module } from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { TrucksController } from './trucks.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Truck, TruckSchema } from './entities/truck.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Truck.name, schema: TruckSchema }]),
  ],
  controllers: [TrucksController],
  providers: [TrucksService],
  exports: [MongooseModule], // Exportando o MongooseModule para que outros módulos possam usar
})
export class TrucksModule {}
