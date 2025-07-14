import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Program } from './program.entity';
import { User } from './user.entity';
import { Deployment } from './deployment.entity';
import { Project } from './project.entity';
import { ContentMetadata } from './content_metadata.entity';

@Entity('deployment_metadata')
export class DeploymentMetadata extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @PrimaryColumn({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'varchar' })
  revision: string;

  @Column({ type: 'varchar' })
  platform: string;

  @Column({ type: 'boolean' })
  published: boolean;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  deployment_id: string;

  @Column({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'varchar' })
  computer_name?: string;

  @Column({ type: 'jsonb' })
  languages: string[];

  @Column({ type: 'jsonb' })
  variants: string[];

  @Column({ type: 'jsonb' })
  acm_metadata: Record<string, any> = []

  @ManyToOne(() => Project)
  @JoinColumn({ referencedColumnName: "_id", name: "project_id" })
  project: Project;

  @ManyToOne(() => Deployment)
  @JoinColumn({ referencedColumnName: "_id", name: "deployment_id" })
  deployment: Deployment;

  @ManyToOne(() => User)
  @JoinColumn({ referencedColumnName: "_id", name: "user_id" })
  user: User;

  @OneToMany(() => ContentMetadata, (c) => c.deploymentMetadata)
  contents: ContentMetadata[];
}
