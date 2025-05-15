import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  ManyToOne,
  JoinColumn,
  OneToMany,
  BaseEntity
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { Project } from './project.entity';

@Entity('deployments')
@Unique('deployments_uniqueness_key', ['project', 'deployment'])
@Unique('uq_deployment__id', ['_id'])
export class Deployment extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /**
  * TODO: rename to 'id' after migration
  */
  @Column({ type: "uuid", default: () => "uuid_generate_v4()", unique: true })
  _id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  deploymentname: string;

  @Column({ type: 'int', nullable: false })
  deploymentnumber: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  deployment: string;

  @Column({ type: 'varchar', name: 'project', nullable: false })
  project_id: string;

  @Column({ type: 'date', name: 'startdate', nullable: false })
  start_date: Date;

  @Column({ type: 'date', name: 'enddate', nullable: false })
  end_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  distribution: string;

  @Column({ type: 'varchar', nullable: true })
  comment: string;

  @Column({ type: 'varchar', nullable: false })
  component: string;

  @Column({ default: false })
  is_published: boolean;

  @OneToMany(() => Playlist, playlist => playlist.deployment)
  playlists: Playlist[];

  @ManyToOne(() => Project, project => project.deployments)
  @JoinColumn({ name: 'project', referencedColumnName: 'code' })
  project: Project;
}
