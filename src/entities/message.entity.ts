import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Unique,
  JoinColumn,
  InsertEvent,
  EventSubscriber,
  BaseEntity,
  EntitySubscriberInterface,
} from 'typeorm';
import { SupportedCategory } from './category.entity';
import { Playlist } from './playlist.entity';


@Entity('messages')
@Unique(['program_id', 'playlist_id', 'position'])
@Unique(['program_id', 'playlist_id', 'title'])
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  program_id: string;

  @Column()
  playlist_id: number;

  @Column()
  position: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  format: string;

  @Column({ nullable: true })
  default_category_code: string;

  @Column({ nullable: true })
  variant: string;

  @Column({ nullable: true })
  sdg_goal_id: number;

  @Column({ nullable: true })
  sdg_target_id: string;

  @Column({ nullable: true })
  key_points: string;

  // @ManyToOne(() => SupportedCategory, (category) => category.messages)
  // @JoinColumn({ name: 'defaultCategoryCode', referencedColumnName: 'categorycode' })
  // category: SupportedCategory;

  @ManyToOne(() => Playlist)
  @JoinColumn({ name: 'playlist_id' })
  playlist: Playlist;

  // @ManyToOne(() => SustainableDevelopmentGoals, (goal) => goal.messages)
  // @JoinColumn({ name: 'sdgGoalId', referencedColumnName: 'sdg_goal_id' })
  // sdgGoal: SustainableDevelopmentGoals;

  // @ManyToOne(() => SustainableDevelopmentTargets, (target) => target.messages)
  // @JoinColumn([
  //   { name: 'sdgGoalId', referencedColumnName: 'sdg_goal_id' },
  //   { name: 'sdgTargetId', referencedColumnName: 'sdg_target' },
  // ])
  // sdgTarget: SustainableDevelopmentTargets;

  @OneToMany(() => MessageLanguages, (messageLanguage) => messageLanguage.message, {
    cascade: true,
  })
  languages: MessageLanguages[];
}

@Entity('message_languages')
export class MessageLanguages extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message_id: number;

  @Column()
  language_code: string;

  @ManyToOne(() => Message, (message) => message.languages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  // @ManyToOne(() => SupportedLanguage, (language) => language.messageLanguages)
  // @JoinColumn({ name: 'language_code' })
  // language: SupportedLanguage;
}

@EventSubscriber()
export class MessageSubscriber
  implements EntitySubscriberInterface<Message> {
  /**
   * Indicates that this subscriber only listen to Subscription events.
   */
  listenTo() {
    return Message;
  }

  /**
   * Called before post insertion.
   */
  async beforeInsert(event: InsertEvent<Message>) {
    const maxPosition = await Message.createQueryBuilder('message')
      .select('COALESCE(MAX(message.position), 0)', 'max')
      .where('message.program_id = :programId', { programId: event.entity.program_id })
      .andWhere('message.playlist_id = :playlistId', { playlistId: event.entity.playlist_id })
      .getRawOne();

    event.entity.position = (maxPosition.max || 0) + 1;
    event.entity.title = `Message ${event.entity.position}`;
  }
}
