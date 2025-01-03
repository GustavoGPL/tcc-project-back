import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Report } from './entities/report.entity';
import { Model } from 'mongoose';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(@InjectModel(Report.name) private reportModel: Model<Report>) {}

  create(createReportDto: CreateReportDto) {
    const report = new this.reportModel(createReportDto);
    return report.save();
  }

  findAll() {
    return this.reportModel.find();
  }

  findOne(id: string) {
    return this.reportModel.findById(id);
  }

  update(id: string, updateReportDto: UpdateReportDto) {
    return this.reportModel.findByIdAndUpdate(id, updateReportDto, {
      new: true,
    });
  }

  remove(id: string) {
    return this.reportModel
      .deleteOne({
        _id: id,
      })
      .exec();
  }

  async finalizeReport(id: string) {
    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new ConflictException('Esse relatório não existe.');
    }

    report.isActive = false;
    await report.save();

    return report;
  }
}
