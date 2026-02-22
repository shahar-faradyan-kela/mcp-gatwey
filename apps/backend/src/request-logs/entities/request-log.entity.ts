import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { McpServerEntity } from '../../servers/entities/mcp-server.entity.js';

export enum LogStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

@Entity('request_logs')
export class RequestLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  toolName!: string;

  @Column({ length: 100 })
  serverAlias!: string;

  @ManyToOne(() => McpServerEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'server_id' })
  server!: McpServerEntity | null;

  @Column({ name: 'server_id', nullable: true })
  serverId!: string | null;

  @Column('int')
  latencyMs!: number;

  @Column({ type: 'enum', enum: LogStatus })
  status!: LogStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Index()
  @CreateDateColumn()
  createdAt!: Date;
}
