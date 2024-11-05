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
  EntitySubscriberInterface,
} from "typeorm";
import { Deployment } from "./deployment.entity";
import { Message } from "./message.entity";

@Entity("playlists")
@Unique('uq_playlist__id', ['_id'])
// @Unique(['programId', 'deploymentId', 'position'])
// @Unique(['programId', 'deploymentId', 'title'])
export class Playlist extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { name: "id" })
  id: number;

  /**
   * TODO: rename to 'id' after migration
   */
  @Column({ type: "uuid", default: () => "uuid_generate_v4()", unique: true })
  _id: string;

  @Column({ type: "varchar", name: "program_id" })
  program_id: string;

  @Column({ type: "varchar", name: "deployment_id" })
  deployment_id: number;

  @Column({ name: "position", type: "int" })
  position: number;

  @Column({ name: "title", type: "varchar" })
  title: string;

  @Column({ nullable: true, name: "audience" })
  audience: string;

  @OneToMany(
    () => Message,
    (message) => message.playlist,
  )
  messages: Message[];

  // @ManyToOne(() => Project, (project) => project.playlists)
  // project: Project;

  @ManyToOne(
    () => Deployment,
    (deployment) => deployment.playlists,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "deployment_id", referencedColumnName: "id" })
  deployment: Deployment;
}

@EventSubscriber()
export class PlaylistSubscriber implements EntitySubscriberInterface<Playlist> {
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
    if (Number.isInteger(event.entity.position)) return;

    const result = await Playlist.createQueryBuilder()
      .select("COALESCE(MAX(playlist.position), 0)", "max")
      .from(Playlist, "playlist")
      .where("playlist.program_id = :programId", {
        programId: event.entity.program_id,
      })
      .andWhere("playlist.deployment_id = :deploymentId", {
        deploymentId: event.entity.deployment_id,
      })
      .getRawOne();

    event.entity.position = (result.max ?? 0) + 1;
  }
}
