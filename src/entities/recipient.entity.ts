import {
  Entity,
  PrimaryColumn,
  Column,
  Unique,
  Check,
  ManyToOne,
  JoinColumn,
  OneToMany,
  BaseEntity,
  BeforeInsert,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from "typeorm";
import { TalkingBookDeployed } from "./tb_deployed.entity";
import { Project } from "./project.entity";
import { createHash } from "node:crypto";
// import { TalkingBookDeployed } from './tb_deployed_model';
// import { Point } from 'geojson';

@Entity("recipients")
@Unique("recipients_uniqueness_key", [
  "project",
  "community_name",
  "group_name",
  "agent",
])
@Check("lowercase_recipientid_check", "LOWER(recipientid) = recipientid")
export class Recipient extends BaseEntity {
  @PrimaryColumn({ name: "recipientid", type: "varchar" })
  id: string;

  @PrimaryColumn({ name: "project", type: "varchar" })
  program_id: string;

  @Column({ name: "communityname", type: "varchar" })
  community_name: string;

  @Column({ name: "groupname", type: "varchar" })
  group_name: string;

  @Column({ type: "varchar" })
  component: string;

  @Column({ type: "varchar" })
  country: string;

  @Column({ type: "varchar" })
  region: string;

  @Column({ type: "varchar" })
  district: string;

  @Column({ name: "numhouseholds", type: "int" })
  num_households: number;

  @Column({ name: "numtbs", type: "int" })
  numtbs: number;

  @Column({ name: "supportentity", type: "varchar" })
  support_entity: string;

  @Column({ type: "varchar" })
  listening_model: string;

  @Column({ type: "varchar" })
  language: string;

  @Column({ type: "point" })
  coordinates: Record<string, any>;

  @Column({ type: "varchar" })
  agent: string;

  @Column({ type: "double precision", nullable: true })
  latitude: number;

  @Column({ type: "double precision", nullable: true })
  longitude: number;

  @Column({ type: "varchar", nullable: true })
  variant: string;

  @Column({ type: "int" })
  group_size: number;

  @Column({ type: "json" })
  deployments: string[];

  @Column({ type: "varchar", nullable: true })
  agent_gender: string;

  @Column({ type: "int", nullable: true, name: 'direct_beneficiaries' })
  direct_beneficiaries: number;

  @Column({ type: "json", nullable: true, name: 'direct_beneficiaries_additional', default: {} })
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  direct_beneficiaries_additional: Record<string, any> = {}

  @Column({ type: "int", nullable: true, name: 'indirect_beneficiaries' })
  indirect_beneficiaries: number;

  @OneToMany(
    () => TalkingBookDeployed,
    (talkingBookDeployed) => talkingBookDeployed.recipient,
  )
  talkingbooks_deployed: TalkingBookDeployed[];

  @ManyToOne(() => Project)
  @JoinColumn({ name: "project", referencedColumnName: "code" })
  project: Project;
}

@EventSubscriber()
export class RecipientSubscriber
  implements EntitySubscriberInterface<Recipient> {
  /**
   * Indicates that this subscriber only listen to Subscription events.
   */
  listenTo() {
    return Recipient;
  }

  /**
   * Called before post insertion.
   */
  async beforeInsert(event: InsertEvent<Recipient>) {
    if (event.entity.id != null && event.entity.id !== "") return;

    const ids = [
      event.entity.program_id,
      event.entity.country,
      event.entity.region,
      event.entity.district,
      event.entity.community_name,
      event.entity.agent,
      event.entity.group_name,
      event.entity.language,
      event.entity.variant,
    ];
    const name = ids.map((r) => r || "").join("-");
    // Uncomment next line to add some salt ⃰ to the string.
    //   ⃰yes, it's not really salt, because we don't save it per recipient. It simply adds some randomness.
    // name += Math.random().toString();
    const hash = createHash("sha1").update(name, "utf8").digest("hex");
    event.entity.id = hash.substring(0, 16);
  }
}
