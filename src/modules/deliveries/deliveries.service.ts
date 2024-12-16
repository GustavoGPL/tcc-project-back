import { ConflictException, Injectable } from '@nestjs/common';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Delivery } from './entities/delivery.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Truck } from '../trucks/entities/truck.entity';
import * as moment from 'moment-timezone';
import { Driver } from '../drivers/entities/driver.entity';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
    @InjectModel(Truck.name) private truckModel: Model<Truck>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto) {
    const {
      caminhaoId,
      valorCarga,
      motoristaId,
      tipoCarga,
      temSeguro,
      regiao,
      dataInicio,
      dataFim,
      ...rest
    } = createDeliveryDto;

    if (regiao === 'Nordeste') {
      const motorista = await this.driverModel.findById(motoristaId);

      if (motorista.entregasNordeste >= 1) {
        throw new ConflictException(
          'Este motorista já possui uma entrega para o Nordeste.',
        );
      }

      // Incrementar o contador de entregas para o Nordeste
      await this.driverModel.findByIdAndUpdate(createDeliveryDto.motoristaId, {
        entregasNordeste: motorista.entregasNordeste + 1,
      });
    }

    let valorComTaxa = valorCarga;
    switch (regiao) {
      case 'Nordeste':
        valorComTaxa = valorCarga * 1.2; // 20% de taxa
        break;
      case 'Argentina':
        valorComTaxa = valorCarga * 1.4; // 40% de taxa
        break;
      case 'Amazônia':
        valorComTaxa = valorCarga * 1.3; // 30% de taxa
        break;
      default:
        break;
    }

    if (tipoCarga === 'Eletrônicos' && temSeguro === undefined) {
      throw new ConflictException(
        'O campo "temSeguro" é obrigatório para entregas de Eletrônicos.',
      );
    }

    const isValiosa = valorComTaxa > 30000;
    const isCargaPerigosa = tipoCarga === 'Combustível';

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1); // Primeiro dia do mês
    currentMonthStart.setHours(0, 0, 0, 0); // Hora inicial

    const currentMonthEnd = new Date(currentMonthStart);
    currentMonthEnd.setMonth(currentMonthStart.getMonth() + 1);
    currentMonthEnd.setHours(23, 59, 59, 999); // Último dia do mês

    const deliveriesInMonthForTruck = await this.deliveryModel.countDocuments({
      caminhaoId,
      $or: [
        {
          dataInicio: { $gte: currentMonthStart, $lte: currentMonthEnd },
        },
        {
          dataFim: { $gte: currentMonthStart, $lte: currentMonthEnd },
        },
        {
          dataInicio: { $lte: currentMonthStart },
          dataFim: { $gte: currentMonthEnd },
        },
      ],
    });

    if (deliveriesInMonthForTruck >= 4) {
      throw new ConflictException(
        'Este caminhão já atingiu o limite de 4 entregas neste mês.',
      );
    }

    const adjustedDataInicio = moment(dataInicio)
      .tz('America/Sao_Paulo')
      .toDate();
    const adjustedDataFim = moment(dataFim).tz('America/Sao_Paulo').toDate();

    const delivery = new this.deliveryModel({
      ...rest,
      motoristaId,
      caminhaoId,
      valorCarga: valorComTaxa,
      tipoCarga,
      valiosa: isValiosa,
      temSeguro: tipoCarga === 'Eletrônicos' ? temSeguro : false,
      cargaPerigosa: isCargaPerigosa,
      regiao,
      dataInicio: adjustedDataInicio,
      dataFim: adjustedDataFim,
    });

    const truck = await this.truckModel.findById(createDeliveryDto.caminhaoId);

    if (truck && truck.entregaId) {
      throw new ConflictException(
        'Este caminhão já está associado a uma entrega',
      );
    }

    const existingDeliveryForDriver = await this.deliveryModel.findOne({
      motoristaId,
      status: { $ne: 'Concluída' },
    });

    if (existingDeliveryForDriver) {
      throw new ConflictException(
        'Este motorista já está associado a uma entrega em andamento',
      );
    }

    await delivery.save();

    await this.truckModel.findByIdAndUpdate(createDeliveryDto.caminhaoId, {
      status: 'Em uso',
      entregaId: delivery._id,
    });

    return delivery;
  }

  async findAll() {
    return await this.deliveryModel
      .find()
      .populate('motoristaId', '_id nome')
      .populate('caminhaoId', '_id modelo placa');
  }

  findOne(id: string) {
    return this.deliveryModel
      .findById(id)
      .populate('motoristaId', '_id nome')
      .populate('caminhaoId', '_id modelo placa');
  }

  update(id: string, updateDeliveryDto: UpdateDeliveryDto) {
    const { valorCarga, ...rest } = updateDeliveryDto;

    const isValiosa = valorCarga ? valorCarga > 30000 : undefined;

    return this.deliveryModel.findByIdAndUpdate(
      id,
      {
        ...rest,
        ...(valorCarga && { valorCarga }),
        ...(isValiosa !== undefined && { valiosa: isValiosa }),
      },
      { new: true },
    );
  }

  async remove(id: string) {
    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new ConflictException('Essa entrega não existe');
    }

    await this.truckModel.findByIdAndUpdate(delivery.caminhaoId, {
      $unset: { entregaId: '' },
      $set: { status: 'Disponível' },
    });

    return this.deliveryModel
      .deleteOne({
        _id: id,
      })
      .exec();
  }
}
