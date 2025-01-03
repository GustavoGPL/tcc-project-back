import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsModule } from './modules/services/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ||
        'mongodb+srv://gustavoguillan23:oSNUv6MfGSLyidrz@cluster0.p4nfbig.mongodb.net/projeto_tcc',
    ),
    ReportsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
