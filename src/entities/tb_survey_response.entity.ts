import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity("survey_responses")
export class TalkingBookSurveyResponse extends BaseEntity {
	@PrimaryGeneratedColumn("uuid", { name: "survey_uuid" })
	survey_uuid: string;

	@Column({ type: "text", name: "question" })
	question: string;

	@Column({ type: "text", name: "response" })
	response: string;
}
