import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { User } from "./user.entity";
import { _BaseEntity } from "./base.entity";

@Entity({ name: "logs" })
export class Log extends _BaseEntity {
  @Column({ type: "text" })
  message: string;

  @Column({ type: "text", nullable: true })
  data?: string;

  @Column({ type: "text", nullable: true })
  extra?: string;

  @Column({ type: "text", nullable: true })
  tags?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ referencedColumnName: "_id" })
  user?: User;

  @Column({ type: "uuid", nullable: true })
  user_id?: string;
}
