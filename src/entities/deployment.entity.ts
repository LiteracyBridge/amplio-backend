import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { Project } from './project.entity';

@Entity('deployments')
@Unique('deployments_uniqueness_key', ['project', 'deployment'])
export class Deployment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  deploymentname: string;

  @Column({ type: 'int', nullable: false })
  deploymentnumber: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  deployment: string;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  distribution: string;

  @Column({ type: 'varchar', nullable: true })
  comment: string;

  @Column({ type: 'varchar', nullable: false })
  component: string;

  @OneToMany(() => Playlist, playlist => playlist.deployment)
  playlists: Playlist[];

  @ManyToOne(() => Project, project => project.deployments)
  @JoinColumn({ name: 'project' })
  project: Project;
}
