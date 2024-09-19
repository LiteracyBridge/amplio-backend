import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BaseEntity
} from "typeorm";
import { Project } from "./project.entity";

@Entity("acm_checkout")
export class ACMCheckout extends BaseEntity{
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", nullable: true })
  lastInName?: string;

  @Column({ type: "varchar", nullable: true })
  lastInVersion?: string;

  @Column({ type: "varchar", nullable: true })
  lastInComment?: string;

  @Column({ type: "varchar", nullable: true })
  lastInContact?: string;

  @Column({ type: "varchar", nullable: true })
  nowOutName?: string;

  @Column({ type: "varchar", nullable: true })
  nowOutContact?: string;

  @Column({ type: "timestamptz", nullable: true })
  nowOutDate?: Date;

  @Column({ type: "varchar", nullable: true })
  nowOutVersion?: string;

  @Column({ type: "varchar", nullable: true })
  nowOutComment?: string;

  @Column({ type: "varchar", nullable: true })
  nowOutKey?: string;

  @Column({ type: "varchar", nullable: true })
  acmComment?: string;

  @Column({ type: "varchar", nullable: false })
  acmState: string;

  @Column({ type: "varchar", nullable: false })
  lastInFileName: string;

  @Column({ type: "timestamptz", nullable: false })
  lastInDate: Date;

  @Column({ type: "uuid", unique: true, nullable: true })
  projectId?: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: "project_id" })
  project?: Project;
}
