import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';

@Entity('contentmetadata2')
export class ContentMetadata extends BaseEntity {
  @PrimaryColumn({ type: 'varchar' })
  project: string;

  @Column({ name: 'contentid', type: 'varchar' })
  content_id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  source: string;

  @Column({ name: 'languagecode', type: 'varchar' })
  language_code: string;
}
