import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Delivery, DeliverySchema } from './entities/delivery.entity';
import { Truck, TruckSchema } from '../trucks/entities/truck.entity';
import { Driver, DriverSchema } from '../drivers/entities/driver.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Delivery.name, schema: DeliverySchema },
      { name: Truck.name, schema: TruckSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
