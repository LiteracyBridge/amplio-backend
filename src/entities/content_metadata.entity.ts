import { Entity, PrimaryColumn, Column, BaseEntity, JoinColumn, ManyToOne } from 'typeorm';
import { Playlist } from './playlist.entity';
import { DeploymentMetadata } from './deployment_metadata.entity';

export enum ContentType {
  message = "message",
  playlist_prompt = "playlist_prompt",
  system_prompt = "system_prompt",
}

@Entity('contentmetadata2')
export class ContentMetadata extends BaseEntity {
  @PrimaryColumn({ type: 'varchar' })
  project: string;

  @Column({ name: 'contentid', type: 'varchar' })
  content_id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  dc_publisher?: string;

  @Column({ type: 'varchar', nullable: true })
  dtb_revision?: string;

  @Column({ type: 'varchar', nullable: true })
  duration_sec?: string;

  @Column({ type: 'varchar', nullable: true })
  format?: string;

  @Column({ type: 'varchar', nullable: true })
  keywords?: string;

  @Column({ type: 'varchar', nullable: true })
  timing?: string;

  @Column({ type: 'varchar', nullable: true })
  speaker?: string;

  @Column({ type: 'varchar', nullable: true })
  goal?: string;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', nullable: true })
  community?: string;

  @Column({ type: 'varchar', nullable: true })
  categories?: string;

  @Column({ type: 'varchar', nullable: true })
  status?: string;

  @Column({ type: 'varchar', nullable: true })
  sdg_goals?: string;

  @Column({ type: 'varchar', nullable: true })
  sdg_targets?: string;

  @Column({ type: 'varchar', nullable: true })
  quality?: string;

  @Column({ type: 'varchar', name: 'relatedid', nullable: true })
  related_id?: string;

  @Column({ type: 'varchar', name: 'targetaudience', nullable: true })
  audience?: string;

  @Column({ type: 'varchar', name: 'daterecorded', nullable: true })
  recorded_at?: string;

  @Column({ type: 'varchar', name: 'transcriptionurl', nullable: true })
  transcription_url?: string;

  @Column({ type: 'varchar' })
  source: string;

  @Column({ name: 'languagecode', type: 'varchar' })
  language_code: string;

  @Column({ type: 'varchar', nullable: true })
  transcription?: string;

  @Column({ type: 'varchar', nullable: true })
  variant?: string;

  @Column({ type: 'varchar', nullable: true })
  relative_path?: string;

  @Column({ type: 'varchar', nullable: true })
  type?: ContentType;

  @Column({ type: 'double', nullable: true })
  size?: number;

  @Column({ type: 'double', nullable: true })
  position?: number;

  @Column({ type: 'uuid', nullable: true })
  playlist_id?: string;

  @Column({ type: 'uuid', nullable: true })
  deployment_metadata_id?: string;

  @ManyToOne(() => Playlist)
  @JoinColumn({ referencedColumnName: "_id" })
  playlist?: Playlist;

  @ManyToOne(() => DeploymentMetadata)
  @JoinColumn({ referencedColumnName: "id", name: "deployment_metadata_id" })
  deploymentMetadata?: DeploymentMetadata;
}
