import { ConflictException, Injectable } from '@nestjs/common';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Delivery } from './entities/delivery.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Truck } from '../trucks/entities/truck.entity';
import moment from 'moment-timezone';
import { Driver } from '../drivers/entities/driver.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
    @InjectModel(Truck.name) private truckModel: Model<Truck>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateDeliveryStatus() {
    const currentDate = moment().tz('America/Sao_Paulo').toDate().toISOString();
    const deliveriesToUpdate = await this.deliveryModel.find({
      status: 'AguardandoInício',
      dataInicio: { $lte: currentDate },
    });

    if (deliveriesToUpdate.length > 0) {
      for (const delivery of deliveriesToUpdate) {
        delivery.status = 'Andamento';
        await delivery.save();
      }
    }

    const deliveriesToUpdateCompleted = await this.deliveryModel.find({
      status: 'Andamento', // Ou outro status que represente entregas em andamento
      dataFim: { $lte: currentDate },
    });

    if (deliveriesToUpdateCompleted.length > 0) {
      for (const delivery of deliveriesToUpdateCompleted) {
        delivery.status = 'Concluída';
        await delivery.save();
      }
    }
  }

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
    }

    let valorComTaxa = valorCarga;
    switch (regiao) {
      case 'Nordeste':
        valorComTaxa = valorCarga * 1.2;
        break;
      case 'Argentina':
        valorComTaxa = valorCarga * 1.4;
        break;
      case 'Amazônia':
        valorComTaxa = valorCarga * 1.3;
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
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const currentMonthEnd = new Date(currentMonthStart);
    currentMonthEnd.setMonth(currentMonthStart.getMonth() + 1);
    currentMonthEnd.setHours(23, 59, 59, 999);

    const adjustedDataInicio = moment(dataInicio)
      .tz('America/Sao_Paulo')
      .set({ hour: 5, minute: 0, second: 0, millisecond: 0 })
      .toDate()
      .toISOString();

    const monthStart = moment(adjustedDataInicio).startOf('month').toDate();
    const monthEnd = moment(adjustedDataInicio).endOf('month').toDate();

    const deliveriesInMonthForTruck = await this.deliveryModel.countDocuments({
      caminhaoId,
      dataInicio: { $gte: monthStart, $lte: monthEnd },
    });

    if (deliveriesInMonthForTruck >= 4) {
      throw new ConflictException(
        'Este caminhão já atingiu o limite de 4 entregas neste mês.',
      );
    }

    let status = 'AguardandoInício';

    const currentDate = moment().tz('America/Sao_Paulo').toDate().toISOString();

    if (adjustedDataInicio <= currentDate) {
      status = 'Andamento';
    }

    const adjustedDataFim = moment(dataFim)
      .tz('America/Sao_Paulo')
      .set({ hour: 14, minute: 0, second: 0, millisecond: 0 })
      .toDate()
      .toISOString();

    const conflictingDelivery = await this.deliveryModel.findOne({
      motoristaId,
      status: 'AguardandoInício',
      $or: [
        {
          dataInicio: { $lt: adjustedDataFim },
          dataFim: { $gt: adjustedDataInicio },
        },
      ],
    });

    if (conflictingDelivery) {
      throw new ConflictException(
        'Este motorista já possui uma entrega agendada ou em andamento no período da nova entrega.',
      );
    }

    const currentDayStart = moment()
      .tz('America/Sao_Paulo')
      .startOf('day')
      .toDate()
      .toISOString();

    if (adjustedDataInicio < currentDayStart) {
      throw new ConflictException(
        'A data de início da entrega não pode ser em um dia que já passou.',
      );
    }

    if (adjustedDataFim < adjustedDataInicio) {
      throw new ConflictException(
        'A data de término da entrega não pode ser anterior à data de início.',
      );
    }

    if (adjustedDataFim < currentDayStart) {
      throw new ConflictException(
        'A data de término da entrega não pode ser em um dia que já passou.',
      );
    }

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
      status,
    });

    const truck = await this.truckModel.findById(createDeliveryDto.caminhaoId);

    if (truck && truck.entregaId) {
      throw new ConflictException(
        'Este caminhão já está associado a uma entrega',
      );
    }

    const deliveriesInMonthForDriver = await this.deliveryModel.countDocuments({
      motoristaId,
      status: { $in: ['AguardandoInício', 'Concluída'] },
      $or: [
        { dataInicio: { $lte: monthEnd, $gte: monthStart } },
        { dataFim: { $gte: monthStart, $lte: monthEnd } },
        {
          dataInicio: { $lte: monthStart },
          dataFim: { $gte: monthEnd },
        },
      ],
    });

    if (deliveriesInMonthForDriver >= 2) {
      throw new ConflictException(
        'Este motorista já atingiu o limite de 2 entregas neste mês.',
      );
    }

    const existingDeliveryForDriver = await this.deliveryModel.findOne({
      motoristaId,
      status: { $nin: ['Concluída', 'Removida', 'AguardandoInício'] },
    });

    if (existingDeliveryForDriver) {
      throw new ConflictException(
        'Este motorista já está associado a uma entrega em andamento',
      );
    }

    await delivery.save();

    if (regiao === 'Nordeste' && status === 'Andamento') {
      await this.driverModel.findByIdAndUpdate(motoristaId, {
        $inc: { entregasNordeste: 1 },
      });
    }

    await this.truckModel.findByIdAndUpdate(createDeliveryDto.caminhaoId, {
      status: delivery.status === 'Andamento' ? 'Em uso' : 'Disponível',
      entregaId:
        delivery.status === 'Andamento' ? delivery._id : truck.entregaId,
    });

    const motoristaStatus =
      delivery.status === 'AguardandoInício' ? 'Disponível' : 'Indisponível';

    await this.driverModel.findByIdAndUpdate(delivery.motoristaId, {
      $set: { status: motoristaStatus },
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

    if (delivery.status !== 'Concluída' && delivery.status !== 'Removida') {
      await this.driverModel.findByIdAndUpdate(delivery.motoristaId, {
        $set: { status: 'Disponível' },
      });
    }

    if (delivery.regiao === 'Nordeste' && delivery.status !== 'Concluída') {
      await this.driverModel.findByIdAndUpdate(delivery.motoristaId, {
        $inc: { entregasNordeste: -1 },
      });
    }

    // return this.deliveryModel
    //   .deleteOne({
    //     _id: id,
    //   })
    //   .exec();

    return this.deliveryModel.findByIdAndUpdate(
      id,
      { status: 'Removida' },
      { new: true },
    );
  }

  async finalizeDelivery(id: string) {
    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new ConflictException('Essa entrega não existe.');
    }

    if (delivery.status !== 'Andamento') {
      throw new ConflictException(
        'A entrega só pode ser concluída se estiver em andamento.',
      );
    }

    delivery.status = 'Concluída';
    await delivery.save();

    // Atualizar status do caminhão e motorista associados
    await this.truckModel.findByIdAndUpdate(delivery.caminhaoId, {
      $unset: { entregaId: '' },
      $set: { status: 'Disponível' },
    });

    await this.driverModel.findByIdAndUpdate(delivery.motoristaId, {
      $set: { status: 'Disponível' },
    });

    return delivery;
  }
}
