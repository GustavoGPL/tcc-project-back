import { Module } from '@nestjs/common';
import { TrucksModule } from './modules/trucks/trucks.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DriversModule } from './modules/drivers/drivers.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://gustavoguillan23:oSNUv6MfGSLyidrz@cluster0.p4nfbig.mongodb.net/devgustavo',
    ),
    TrucksModule,
    DriversModule,
    DeliveriesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
