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
@Unique(['programId', 'playlistId', 'position'])
@Unique(['programId', 'playlistId', 'title'])
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  programId: string;

  @Column()
  playlistId: number;

  @Column()
  position: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  format: string;

  @Column({ nullable: true })
  defaultCategoryCode: string;

  @Column({ nullable: true })
  variant: string;

  @Column({ nullable: true })
  sdgGoalId: number;

  @Column({ nullable: true })
  sdgTargetId: string;

  @Column({ nullable: true })
  keyPoints: string;

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
      .where('message.programId = :programId', { programId: event.entity.programId })
      .andWhere('message.playlistId = :playlistId', { playlistId: event.entity.playlistId })
      .getRawOne();

    event.entity.position = (maxPosition.max || 0) + 1;
    event.entity.title = `Message ${event.entity.position}`;
  }
}
