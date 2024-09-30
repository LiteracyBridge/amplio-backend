import {
  Entity,
  Unique,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Survey } from "./survey.entity";

@Entity("uf_survey_sections")
@Unique("unq__id", ["_id"])
export class SurveySection extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "uuid", name: '_id', default: () => "uuid_generate_v4()", unique: true })
  _id: string;

  @Column({ type: "varchar", default: "Untitled Section" })
  name: string;

  @Column({ type: "int", nullable: true, name: "survey_id" })
  survey_id: number;

  @DeleteDateColumn({ type: "timestamptz" })
  deleted_at?: Date;

  @ManyToOne(
    () => Survey,
    (row) => row.sections,
  )
  @JoinColumn({ name: "survey_id", referencedColumnName: "id" })
  survey: Survey;
}
