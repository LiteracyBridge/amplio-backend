import { Entity, PrimaryColumn, Column, ManyToOne, BaseEntity, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('languages')
export class ProjectLanguage extends BaseEntity {
  @PrimaryColumn({ name: 'languagecode', type: 'varchar' })
  code: string;

  @Column({ name: 'language', type: 'varchar', nullable: false })
  name: string;

  @PrimaryColumn({ name: 'projectcode', type: 'varchar' })
  projectcode: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectcode' })
  project: Project;
}

@Entity('supportedlanguages')
export class Language extends BaseEntity {
  @PrimaryColumn({ name: 'languagecode', type: 'varchar' })
  code: string;

  @Column({ name: 'languagename', type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  comments: string;
}
