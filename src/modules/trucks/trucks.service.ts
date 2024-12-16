import { Injectable } from '@nestjs/common';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { Truck } from './entities/truck.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class TrucksService {
  constructor(@InjectModel(Truck.name) private truckModel: Model<Truck>) {}

  create(createTruckDto: CreateTruckDto) {
    const truck = new this.truckModel(createTruckDto);
    return truck.save();
  }

  findAll() {
    return this.truckModel.find();
  }

  findOne(id: string) {
    return this.truckModel.findById(id);
  }

  update(id: string, updateTruckDto: UpdateTruckDto) {
    return this.truckModel.findByIdAndUpdate(id, updateTruckDto, {
      new: true,
    });
  }

  remove(id: string) {
    return this.truckModel
      .deleteOne({
        _id: id,
      })
      .exec();
  }
}
