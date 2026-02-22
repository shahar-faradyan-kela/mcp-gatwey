import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuthType {
  NONE = 'none',
  BEARER = 'bearer',
  API_KEY = 'api_key',
}

export enum ServerStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}

@Entity('mcp_servers')
export class McpServerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 100, unique: true })
  alias!: string;

  @Column('text')
  url!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'enum', enum: AuthType, default: AuthType.NONE })
  authType!: AuthType;

  @Column({ type: 'text', nullable: true })
  authCredentialsEncrypted!: string | null;

  @Column({ default: true })
  isEnabled!: boolean;

  @Column({ type: 'enum', enum: ServerStatus, default: ServerStatus.UNKNOWN })
  status!: ServerStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
