import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BaseEntity
} from 'typeorm';
import { Deployment } from './deployment.entity';
import { Recipient } from './recipient.entity';

@Entity('tbsdeployed')
export class TalkingBookDeployed extends BaseEntity {
  @PrimaryColumn({ name: 'talkingbookid', type: 'varchar' })
  talkingbook_id: string;

  @PrimaryColumn({ name: 'deployedtimestamp', type: 'timestamp' })
  deployed_timestamp: Date;

  @Column({ name: 'recipientid', type: 'varchar', nullable: true })
  recipient_id: string;

  @Column({ type: 'varchar', nullable: false })
  project: string;

  @Column({ name: 'deployment', type: 'varchar', nullable: false })
  deployment_name: string;

  @Column({ type: 'varchar', name: "deployment_uuid", nullable: true })
  deployment_uuid: string;

  @Column({ name: 'contentpackage', type: 'varchar', nullable: true })
  content_package: string;

  @ManyToOne(() => Deployment)
  @JoinColumn({ name: 'deployment', referencedColumnName: 'deployment' })
  deployment: Deployment;

  @ManyToOne(() => Recipient, (row) => row.talkingbooks_deployed)
  @JoinColumn({ name: 'recipientid', referencedColumnName: 'id' })
  recipient: Recipient;
}
