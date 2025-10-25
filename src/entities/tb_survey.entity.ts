import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	BaseEntity,
} from "typeorm";

@Entity("surveys")
export class TalkingBookSurvey extends BaseEntity {
	@PrimaryGeneratedColumn("uuid", { name: "survey_uuid" })
	survey_uuid: string;

	@Column({ type: "timestamp" })
	timestamp: Date;

	@Column({ type: "text", name: "recipientid" })
	recipientId: string;

	@Column({ type: "text", name: "talkingbookid" })
	talkingBookId: string;

	@Column({ type: "text", name: "programid" })
	programId: string;

	@Column({ type: "text", name: "surveyid" })
	surveyId: string;

	@Column({ type: "text", name: "deployment_uuid" })
	deployment_uuid: string;

	@Column({ type: "text", name: "collection_uuid" })
	collection_uuid: string;
}
