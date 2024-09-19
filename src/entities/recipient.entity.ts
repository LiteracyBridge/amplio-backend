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
@Unique('recipients_uniqueness_key', ['project', 'communityName', 'groupName', 'agent'])
@Check('lowercase_recipientid_check', 'LOWER(recipientid) = recipientid')
export class Recipient extends BaseEntity {
  @PrimaryColumn({ name: 'recipientid', type: 'varchar' })
  id: string;

  @PrimaryColumn({ name: 'project', type: 'varchar' })
  programId: string;

  @Column({ name: 'communityname', type: 'varchar' })
  communityName: string;

  @Column({ name: 'groupname', type: 'varchar' })
  groupName: string;

  @Column({ type: 'varchar' })
  component: string;

  @Column({ type: 'varchar' })
  country: string;

  @Column({ type: 'varchar' })
  region: string;

  @Column({ type: 'varchar' })
  district: string;

  @Column({ name: 'numhouseholds', type: 'int' })
  numHouseholds: number;

  @Column({ name: 'numtbs', type: 'int' })
  numTbs: number;

  @Column({ name: 'supportentity', type: 'varchar' })
  supportEntity: string;

  @Column({ type: 'varchar' })
  listeningModel: string;

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
  groupSize: number;

  @Column({ type: 'json' })
  deployments: any;

  @Column({ type: 'varchar', nullable: true })
  agentGender: string;

  @Column({ type: 'int', nullable: true })
  directBeneficiaries: number;

  @Column({ type: 'json', nullable: true })
  directBeneficiariesAdditional: any;

  @Column({ type: 'int', nullable: true })
  indirectBeneficiaries: number;

  @OneToMany(() => TalkingBookDeployed, (talkingBookDeployed) => talkingBookDeployed.recipient)
  talkingbooksDeployed: TalkingBookDeployed[];

  @ManyToOne(() => Project)
  project: Project;
}
