import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';

@Entity('contentmetadata2')
export class ContentMetadata extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  project: string;

  @PrimaryColumn({ name: 'contentid', type: 'varchar', length: 255 })
  contentId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  source: string;

  @Column({ name: 'languagecode', type: 'varchar', length: 255 })
  languageCode: string;
}
