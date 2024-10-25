

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { _BaseEntity } from './base.entity';
import { Organisation } from './organisation.entity';
import { User } from './user.entity';

@Entity('invitations')
export class Invitation extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
	id: string;

  @Column({ type: 'varchar', nullable: true })
  first_name: string;

  @Column({ type: 'varchar', nullable: true })
  last_name: string;

  @Column({ type: 'varchar', nullable: false, unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone_number: string;

  @Column({ type: 'varchar', nullable: false })
  status: string;

  @Column({ type: 'int' })
  organisation_id: number;

  @ManyToOne(() => Organisation)
  @JoinColumn({ name: 'organisation_id' })
  organisation: Organisation;

  @CreateDateColumn({ type: "timestamptz" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at: Date;

	@DeleteDateColumn({ type: "timestamptz" })
	deleted_at?: Date;

  static async createUser(email: string | Invitation): Promise<User | null> {
    const invitation = typeof email !== 'string' ? email : (await Invitation.findOne({ where: { email } }));
    if (!invitation) {
      return null;
    }

    const user = new User();
    user.first_name = invitation.first_name;
    user.last_name = invitation.last_name;
    user.email = invitation.email;
    user.organisation_id = invitation.organisation_id;

    await user.save()
    await Invitation.remove(invitation);

    return user;
  }
}
