import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  ManyToOne,
  OneToMany,
  BaseEntity,
  EventSubscriber,
  InsertEvent,
  JoinColumn,
  EntitySubscriberInterface
} from 'typeorm';
import { Deployment } from './deployment.entity';
import { Message } from './message.entity';

@Entity('playlists')
// @Unique(['programId', 'deploymentId', 'position'])
// @Unique(['programId', 'deploymentId', 'title'])
export class Playlist extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'program_id' })
  program_id: string;

  @Column({ type: 'varchar', name: 'deployment_id' })
  deployment_id: number;

  @Column()
  position: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  audience: string;

  @OneToMany(() => Message, (message) => message.playlist)
  messages: Message[];

  // @ManyToOne(() => Project, (project) => project.playlists)
  // project: Project;

  @ManyToOne(() => Deployment, (deployment) => deployment.playlists, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'deployment_id', referencedColumnName: 'id' })
  deployment: Deployment;


}


@EventSubscriber()
export class PlaylistSubscriber
  implements EntitySubscriberInterface<Playlist> {
  /**
   * Indicates that this subscriber only listen to Subscription events.
   */
  listenTo() {
    return Playlist;
  }

  /**
   * Called before post insertion.
   */
  async beforeInsert(event: InsertEvent<Playlist>) {
    const result = await Playlist
      .createQueryBuilder()
      .select('COALESCE(MAX(playlist.position), 0)', 'max')
      .from(Playlist, 'playlist')
      .where('playlist.program_id = :programId', { programId: event.entity.program_id })
      .andWhere('playlist.deployment_id = :deploymentId', { deploymentId: event.entity.deployment_id })
      .getRawOne();

    const position = result ? result.max + 1 : 0;
    event.entity.position = position;
    event.entity.title = `Playlist ${position}`;
  }
}
