import { Exclude, instanceToPlain } from "class-transformer";
import {
  JoinColumn,
  BaseEntity,
  Column,
  Entity,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Organisation } from "./organisation.entity";
import { UserRole } from "./user_role.entity";
import { ProgramUser } from "./program_user.entity";

@Entity({ name: "users" })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", nullable: true })
  first_name: string;

  @Column({ type: "varchar", nullable: true })
  last_name: string;

  @Column({ type: "varchar", nullable: false })
  email: string;

  @Column({ type: "varchar", nullable: true })
  phone_number: string;

  @Column({ type: "bigint", nullable: false })
  organisation_id: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;

  @DeleteDateColumn({ type: "timestamptz" })
  deleted_at?: Date;

  // @OneToMany(() => Organisation, (org) => org.id)
  organisation: Organisation;

  @OneToMany(() => UserRole, (ref) => ref.user)
  @JoinColumn({ referencedColumnName: "user_id" })
  roles: UserRole[];

  @OneToMany(() => ProgramUser, (ref) => ref.user)
  @JoinColumn({ referencedColumnName: "program_id" })
  programs: ProgramUser[]

  toJSON() {
    const data = instanceToPlain(this);

    return data;
  }
}
