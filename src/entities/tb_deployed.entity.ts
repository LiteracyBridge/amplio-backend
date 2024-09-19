import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BaseEntity
} from 'typeorm';
import { Deployment } from './deployment.entity';

@Entity('tbsdeployed')
export class TalkingBookDeployed extends BaseEntity {
  @PrimaryColumn({ name: 'talkingbookid', type: 'varchar' })
  talkingbookId: string;

  @PrimaryColumn({ name: 'deployedtimestamp', type: 'timestamp' })
  deployedTimestamp: Date;

  @Column({ name: 'recipientid', type: 'varchar', nullable: true })
  recipientId: string;

  @Column({ type: 'varchar', nullable: false })
  project: string;

  @Column({ name: 'deployment', type: 'varchar', nullable: false })
  deploymentName: string;

  @Column({ type: 'varchar', nullable: true })
  deploymentUuid: string;

  @Column({ name: 'contentpackage', type: 'varchar', nullable: true })
  contentPackage: string;

  @ManyToOne(() => Deployment, { eager: true })
  @JoinColumn({ name: 'deployment', referencedColumnName: 'deployment' })
  deployment: Deployment;
}
