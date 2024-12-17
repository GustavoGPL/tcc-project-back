import { ConflictException, Injectable } from '@nestjs/common';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Delivery } from './entities/delivery.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Truck } from '../trucks/entities/truck.entity';
import * as moment from 'moment-timezone';
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
    const currentDate = moment().tz('America/Sao_Paulo').toDate();
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

    // 1. Verifique se o motorista já tem entrega para a região Nordeste
    if (regiao === 'Nordeste') {
      const motorista = await this.driverModel.findById(motoristaId);

      // Verifica se o motorista já tem uma entrega para a região Nordeste
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
      .tz('America/Sao_Paulo', true)
      .toDate();

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

    const currentDate = moment().tz('America/Sao_Paulo').toDate();
    if (adjustedDataInicio <= currentDate) {
      status = 'Andamento';
    }

    const adjustedDataFim = moment(dataFim).tz('America/Sao_Paulo').toDate();

    const conflictingDelivery = await this.deliveryModel.findOne({
      motoristaId,
      status: 'AguardandoInício', // Verifica entregas no status 'AguardandoInício'
      $or: [
        {
          dataInicio: { $lt: adjustedDataFim }, // A nova entrega começa antes da data de fim da entrega existente
          dataFim: { $gt: adjustedDataInicio }, // E a nova entrega termina depois da data de início da entrega existente
        },
      ],
    });

    if (conflictingDelivery) {
      throw new ConflictException(
        'Este motorista já possui uma entrega agendada ou em andamento no período da nova entrega.',
      );
    }

    // Verifica se a dataInicio é anterior ao início do dia atual (dia vigente no momento da criação)
    const currentDayStart = moment()
      .tz('America/Sao_Paulo')
      .startOf('day')
      .toDate();

    if (adjustedDataInicio < currentDayStart) {
      throw new ConflictException(
        'A data de início da entrega não pode ser em um dia que já passou.',
      );
    }

    // Verifica se a dataFim é anterior à dataInicio
    if (adjustedDataFim < adjustedDataInicio) {
      throw new ConflictException(
        'A data de término da entrega não pode ser anterior à data de início.',
      );
    }

    // Verifica se a dataFim é anterior ao início do dia atual
    if (adjustedDataFim < currentDayStart) {
      throw new ConflictException(
        'A data de término da entrega não pode ser em um dia que já passou.',
      );
    }

    // 2. Cria a entrega
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
      status: 'AguardandoInício',
      dataInicio: { $gte: monthStart, $lte: monthEnd },
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

    // 3. Atualiza o contador de entregasNordeste apenas se a entrega for para a região Nordeste
    if (regiao === 'Nordeste') {
      await this.driverModel.findByIdAndUpdate(motoristaId, {
        $inc: { entregasNordeste: 1 },
      });
    }

    // Atualiza o caminhão e motorista após a criação da entrega
    await this.truckModel.findByIdAndUpdate(createDeliveryDto.caminhaoId, {
      status: 'Em uso',
      entregaId: delivery._id,
    });

    await this.driverModel.findByIdAndUpdate(delivery.motoristaId, {
      $set: { status: 'Indisponível' },
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

    return this.deliveryModel
      .deleteOne({
        _id: id,
      })
      .exec();

    // return this.deliveryModel.findByIdAndUpdate(
    //   id,
    //   { status: 'Removida' },
    //   { new: true },
    // );
  }

  async finalizeDelivery(id: string) {
    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new ConflictException('Essa entrega não existe.');
    }

    if (delivery.status !== 'Andamento') {
      throw new ConflictException(
        'A entrega só pode ser finalizada se estiver em andamento.',
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
