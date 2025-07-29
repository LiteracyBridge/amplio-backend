import {
	Entity,
	PrimaryColumn,
	Column,
	ManyToOne,
	OneToMany,
	JoinColumn,
	BaseEntity,
} from "typeorm";
import { ContentMetadata } from "./content_metadata.entity";
import { Recipient } from "./recipient.entity";
import { Analysis } from "./analysis.entity";
import { Expose } from "class-transformer";

@Entity("uf_messages")
export class UserFeedbackMessage extends BaseEntity {
	@PrimaryColumn({ type: "varchar" })
	message_uuid: string;

	@Column({ name: "programid", type: "varchar" })
	program_id: string;

	@Column({ name: "deploymentnumber", type: "varchar" })
	deployment_number: string;

	@Column({ type: "varchar", default: "en" })
	language: string;

	@Column({ type: "int", nullable: true })
	length_seconds: number;

	@Column({ type: "int", nullable: true })
	length_bytes: number;

	@Column({ type: "varchar", nullable: true })
	transcription?: string;

	@Column({ type: "varchar", nullable: true })
	deployment_tbcdid?: string;

	@Column({ type: "varchar", nullable: true })
	deployment_user?: string;

	@Column({ type: "timestamp", nullable: true })
	deployment_timestamp?: string;

	@Column({ type: "boolean", default: false })
	test_deployment: boolean;

	@Column({ type: "boolean", default: false })
	is_useless: boolean;

	@Column({ type: "varchar", nullable: true })
	collection_timestamp: string;

	@Column({ type: "date", nullable: true })
	date_recorded: Date;

	@Column({ type: "varchar", nullable: true })
	relation: string;

	@Column({ name: "recipientid", type: "varchar", nullable: true })
	recipient_id: string;

	@ManyToOne(() => ContentMetadata)
	@JoinColumn({ name: "relation", referencedColumnName: "content_id" })
	content_metadata: ContentMetadata;

	@ManyToOne(() => Recipient)
	@JoinColumn({ name: "recipientid", referencedColumnName: "id" })
	recipient: Recipient;

	@OneToMany(
		() => Analysis,
		(row) => row.message,
	)
	@JoinColumn({ referencedColumnName: "message_uuid" })
	analysis: Analysis[];

  @Expose()
	get url(): string {
		return `https://amplio-uf.s3.us-west-2.amazonaws.com/collected/${this.program_id}/${this.deployment_number}/${this.message_uuid}.mp3`;
	}
}
