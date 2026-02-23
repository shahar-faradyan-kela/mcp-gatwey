import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { McpServerEntity } from './entities/mcp-server.entity.js';
import { CreateServerDto } from './dto/create-server.dto.js';
import { UpdateServerDto } from './dto/update-server.dto.js';
import { EncryptionService } from '../common/encryption/encryption.service.js';

export interface ServerResponseDto {
  id: string;
  name: string;
  alias: string;
  url: string;
  description: string | null;
  tags: string[];
  authType: string;
  hasAuthCredential: boolean;
  isEnabled: boolean;
  status: string;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ServersService {
  constructor(
    @InjectRepository(McpServerEntity)
    private readonly serversRepo: Repository<McpServerEntity>,
    private readonly encryption: EncryptionService,
  ) {}

  async findAll(): Promise<ServerResponseDto[]> {
    const entities = await this.serversRepo.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toResponse(e));
  }

  async findOne(id: string): Promise<ServerResponseDto> {
    const entity = await this.serversRepo.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`Server with id '${id}' not found`);
    }
    return this.toResponse(entity);
  }

  async create(dto: CreateServerDto): Promise<ServerResponseDto> {
    const entity = this.serversRepo.create({
      name: dto.name,
      alias: dto.alias,
      url: dto.url,
      description: dto.description ?? null,
      tags: dto.tags ?? [],
      authType: dto.authType,
      authCredentialsEncrypted: dto.authCredential
        ? this.encryption.encrypt(dto.authCredential)
        : null,
      isEnabled: dto.isEnabled ?? true,
    });

    try {
      const saved = await this.serversRepo.save(entity);
      return this.toResponse(saved);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          `A server with alias '${dto.alias}' already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateServerDto): Promise<ServerResponseDto> {
    const entity = await this.serversRepo.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`Server with id '${id}' not found`);
    }

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.alias !== undefined) entity.alias = dto.alias;
    if (dto.url !== undefined) entity.url = dto.url;
    if (dto.description !== undefined) entity.description = dto.description ?? null;
    if (dto.tags !== undefined) entity.tags = dto.tags;
    if (dto.authType !== undefined) entity.authType = dto.authType;
    if (dto.isEnabled !== undefined) entity.isEnabled = dto.isEnabled;
    if (dto.authCredential !== undefined) {
      entity.authCredentialsEncrypted = dto.authCredential
        ? this.encryption.encrypt(dto.authCredential)
        : null;
    }

    try {
      const saved = await this.serversRepo.save(entity);
      return this.toResponse(saved);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          `A server with alias '${dto.alias}' already exists`,
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const entity = await this.serversRepo.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`Server with id '${id}' not found`);
    }
    await this.serversRepo.remove(entity);
  }

  async setEnabled(id: string, enabled: boolean): Promise<ServerResponseDto> {
    const entity = await this.serversRepo.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException(`Server with id '${id}' not found`);
    }
    entity.isEnabled = enabled;
    const saved = await this.serversRepo.save(entity);
    return this.toResponse(saved);
  }

  private toResponse(entity: McpServerEntity): ServerResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      alias: entity.alias,
      url: entity.url,
      description: entity.description,
      tags: entity.tags,
      authType: entity.authType,
      hasAuthCredential: entity.authCredentialsEncrypted !== null,
      isEnabled: entity.isEnabled,
      status: entity.status,
      lastCheckedAt: entity.lastCheckedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
