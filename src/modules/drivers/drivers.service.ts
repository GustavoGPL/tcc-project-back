import { Injectable } from '@nestjs/common';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Driver } from './entities/driver.entity';
import { Model } from 'mongoose';

@Injectable()
export class DriversService {
  constructor(@InjectModel(Driver.name) private driverModel: Model<Driver>) {}

  create(createDriverDto: CreateDriverDto) {
    const driver = new this.driverModel(createDriverDto);
    return driver.save();
  }

  findAll() {
    return this.driverModel.find();
  }

  findOne(id: string) {
    return this.driverModel.findById(id);
  }

  update(id: string, updateDriverDto: UpdateDriverDto) {
    return this.driverModel.findByIdAndUpdate(id, updateDriverDto, {
      new: true,
    });
  }

  remove(id: string) {
    return this.driverModel
      .deleteOne({
        _id: id,
      })
      .exec();
  }
}
