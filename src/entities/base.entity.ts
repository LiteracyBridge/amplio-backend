import { Exclude, instanceToPlain } from "class-transformer";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	DeleteDateColumn,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

export abstract class _BaseEntity extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Exclude({ toPlainOnly: true })
	@Column({ type: "varchar", nullable: true })
	_id?: string;

	@CreateDateColumn({ type: "timestamptz" })
	createdAt: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updatedAt: Date;

	@DeleteDateColumn({ type: "timestamptz" })
	deletedAt?: Date;

	toJSON() {
		const data = instanceToPlain(this);

		return data;
	}
}
