import { Exclude, Expose, instanceToPlain } from "class-transformer";
import {
  EventSubscriber,
  JoinColumn,
  BaseEntity,
  Column,
  Entity,
  EntitySubscriberInterface,
  InsertEvent,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  LoadEvent,
  FindOptionsWhere,
  In
} from "typeorm";
import { Organisation } from "./organisation.entity";
import { UserRole } from "./user_role.entity";
import { ProgramUser } from "./program_user.entity";
import { OrganisationProgram } from "./org_program.entity";

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

  @ManyToOne(() => Organisation)
  @JoinColumn({ name: "organisation_id", referencedColumnName: 'id' })
  organisation: Organisation;

  @OneToMany(() => UserRole, (ref) => ref.user)
  @JoinColumn({ referencedColumnName: "user_id" })
  roles: UserRole[];

  @OneToMany(() => ProgramUser, (ref) => ref.user)
  @JoinColumn({ referencedColumnName: "program_id" })
  programs: ProgramUser[]

  @Expose()
  permissions: Record<string, boolean> = {}

  toJSON() {
    const data = instanceToPlain(this);

    return data;
  }

  get organisationQuery(): FindOptionsWhere<OrganisationProgram> {
    if (this.organisation.isParent) {
      return { organisation_id: this.organisation_id }
    }
    return { organisation_id: In([this.organisation.id, this.organisation.parent_id]) }
  }
}


@EventSubscriber()
export class UserSubscriber
  implements EntitySubscriberInterface<User> {
  /**
   * Indicates that this subscriber only listen to Subscription events.
   */
  listenTo() {
    return User;
  }

  /**
   * Called before post insertion.
   */
  async beforeInsert(_event: InsertEvent<User>) {
  }

  async afterLoad(entity: User, event?: LoadEvent<User>): Promise<undefined | User> {
    // Load the permissions from the roles
    for (const role of entity.roles) {
      const items = Object.values(role.role.permissions).flat();
      for (const action of items) {
        entity.permissions[action] = true;
      }
    }
    return entity;
  }
}
