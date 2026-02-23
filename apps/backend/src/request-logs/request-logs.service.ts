import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestLogEntity } from './entities/request-log.entity.js';
import { QueryLogsDto } from './dto/query-logs.dto.js';

@Injectable()
export class RequestLogsService {
  constructor(
    @InjectRepository(RequestLogEntity)
    private readonly logsRepo: Repository<RequestLogEntity>,
  ) {}

  async create(data: Partial<RequestLogEntity>): Promise<RequestLogEntity> {
    const entity = this.logsRepo.create(data);
    return this.logsRepo.save(entity);
  }

  async findAll(
    query: QueryLogsDto,
  ): Promise<{ data: RequestLogEntity[]; total: number }> {
    const qb = this.logsRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (query.serverAlias) {
      qb.andWhere('log.serverAlias = :serverAlias', {
        serverAlias: query.serverAlias,
      });
    }

    if (query.status) {
      qb.andWhere('log.status = :status', { status: query.status });
    }

    if (query.from) {
      qb.andWhere('log.createdAt >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('log.createdAt <= :to', { to: query.to });
    }

    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
