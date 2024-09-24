import {
  Entity,
  PrimaryColumn,
  Column,
  Unique,
  Check,
  ManyToOne,
  JoinColumn,
  OneToMany,
  BaseEntity
} from 'typeorm';
import { TalkingBookDeployed } from './tb_deployed.entity';
import { Project } from './project.entity';
// import { TalkingBookDeployed } from './tb_deployed_model';
// import { Point } from 'geojson';

@Entity('recipients')
@Unique('recipients_uniqueness_key', ['project', 'community_name', 'group_name', 'agent'])
@Check('lowercase_recipientid_check', 'LOWER(recipientid) = recipientid')
export class Recipient extends BaseEntity {
  @PrimaryColumn({ name: 'recipientid', type: 'varchar' })
  id: string;

  @PrimaryColumn({ name: 'project', type: 'varchar' })
  program_id: string;

  @Column({ name: 'communityname', type: 'varchar' })
  community_name: string;

  @Column({ name: 'groupname', type: 'varchar' })
  group_name: string;

  @Column({ type: 'varchar' })
  component: string;

  @Column({ type: 'varchar' })
  country: string;

  @Column({ type: 'varchar' })
  region: string;

  @Column({ type: 'varchar' })
  district: string;

  @Column({ name: 'numhouseholds', type: 'int' })
  num_households: number;

  @Column({ name: 'numtbs', type: 'int' })
  num_tbs: number;

  @Column({ name: 'supportentity', type: 'varchar' })
  support_entity: string;

  @Column({ type: 'varchar' })
  listening_model: string;

  @Column({ type: 'varchar' })
  language: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  coordinates: Record<string, any>;

  @Column({ type: 'varchar' })
  agent: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ type: 'varchar', nullable: true })
  variant: string;

  @Column({ type: 'int' })
  group_size: number;

  @Column({ type: 'json' })
  deployments: any;

  @Column({ type: 'varchar', nullable: true })
  agent_gender: string;

  @Column({ type: 'int', nullable: true })
  direct_beneficiaries: number;

  @Column({ type: 'json', nullable: true })
  direct_beneficiaries_additional: any;

  @Column({ type: 'int', nullable: true })
  indirect_beneficiaries: number;

  @OneToMany(() => TalkingBookDeployed, (talkingBookDeployed) => talkingBookDeployed.recipient)
  talkingbooks_deployed: TalkingBookDeployed[];

  @ManyToOne(() => Project)
  project: Project;
}
