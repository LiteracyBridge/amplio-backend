import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
	IsArray,
	IsBoolean,
	IsEmail,
	IsISO31661Alpha2,
	IsISO8601,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
} from "class-validator";
import { groupBy } from "remeda";
import { Analysis } from "src/entities/analysis.entity";
import { AnalysisChoice } from "src/entities/analysis_choice.entity";
import { ContentMetadata } from "src/entities/content_metadata.entity";
import { Recipient } from "src/entities/recipient.entity";
import { Survey } from "src/entities/survey.entity";
import { UserFeedbackMessage } from "src/entities/uf_message.entity";
import { Question } from "src/entities/uf_question.entity";
import { ApiResponse } from "src/utilities/api_response";
import { FindOptionsWhere } from "typeorm";

const MINIMUM_SECONDS_FILTER = 0; // filters out any UF messages of less than this # of seconds
const MAXIMUM_MINUTES_CHECKOUT = 5; // re-issues the same UUID after this many minutes if the form hasn't yet been submitted

@Injectable()
export class AnalysisService {
	async getAll(surveyId: number) {
		return await Analysis.find({
			where: { question: { survey_id: surveyId } },
		});
	}

	async getMessage(opts: {
		programId: string;
		deployment: string;
		language: string;
		skipped_messages: string;
		survey_id: number;
	}) {
		const { programId, deployment, language, skipped_messages } = opts;
		if (deployment == null && language == null) {
			throw new BadRequestException("Deployment and language are required");
		}

		const skip: string[] =
			(skipped_messages || "")?.split(",").filter((l) => l !== "") ?? [];
		let result = await UserFeedbackMessage.createQueryBuilder("uf_messages")
			.where("uf_messages.programid = :program", { program: programId })
			.andWhere("uf_messages.deploymentnumber = :deployment", { deployment })
			.andWhere("uf_messages.language = :language", { language })
			.andWhere("uf_messages.length_seconds >= :length", {
				length: MINIMUM_SECONDS_FILTER,
			})
			.andWhere(
				"(uf_messages.is_useless IS FALSE OR uf_messages.is_useless IS NULL)",
			)
			.andWhere(
				"NOT EXISTS (SELECT 1 FROM uf_analysis a INNER JOIN uf_questions q ON q.survey_id = :surveyId AND q.id = a.question_id WHERE a.message_uuid = uf_messages.message_uuid)",
				{ surveyId: opts.survey_id || 1 },
			);

		if (skip.length > 0) {
			result = result.andWhere("uf_messages.message_uuid NOT IN (:...skip)", {
				skip: skip,
			});
		}

		result = result
			.leftJoinAndMapMany(
				"uf_messages.analysis",
				Analysis,
				"analysis",
				"uf_messages.message_uuid = analysis.message_uuid",
			)
			.leftJoinAndMapOne(
				"uf_messages.recipient",
				Recipient,
				"recipient",
				"uf_messages.recipientid = recipient.recipientid",
			)
			.leftJoinAndMapOne(
				"uf_messages.content_metadata",
				ContentMetadata,
				"content_metadata",
				"uf_messages.relation = content_metadata.contentid",
			)
			.orderBy("uf_messages.message_uuid")
			.limit(1);

		const data = (await result.getMany()).map((m) => {
			return {
				...m,
				url: `https://amplio-uf.s3.us-west-2.amazonaws.com/collected/${m.program_id}/${m.deployment_number}/${m.message_uuid}.mp3`,
			};
		});
		// console.log(data);
		return data;
	}

	private async _save_choices(analysis: Analysis, choices: number[]) {
		// # Save choices
		for (const id of choices) {
			if (id == null) continue;

			const analysis_choice =
				(await AnalysisChoice.findOne({ where: { id: id } })) ??
				new AnalysisChoice();
			analysis_choice.analysis_id = analysis.id;
			analysis_choice.choice_id = id;
			await analysis_choice.save();
		}
	}

	async createOrUpdate(survey_id: number, dto: AnalysisDto) {
		const survey = await Survey.findOne({
			where: { id: survey_id },
			relations: { questions: true },
		});

		if (survey == null) {
			throw new NotFoundException("Survey not found");
		}

		// Update uf_message
		const message = await UserFeedbackMessage.findOne({
			where: { message_uuid: dto.message_uuid },
		});
		if (message == null) {
			throw new NotFoundException("Message not found");
		}

		message.transcription = dto.transcription;
		message.is_useless = dto.is_useless || false;
		await message.save();

		if (dto.is_useless) {
			return true;
		}

		// Save responses
		for (const item of dto.questions) {
			if (item == null) continue;

			const analysis =
				(await Analysis.findOne({
					where: {
						question: { _id: item.question_id },
						message_uuid: message.message_uuid,
					},
				})) ?? new Analysis();

			analysis.message_uuid = dto.message_uuid;
			analysis.question_id = survey.questions.find(
				(q) => q._id === item.question_id || q.id === item.question_id,
			)?.id!;
			analysis.analyst_email = dto.analyst_email;
			analysis.start_time = new Date(dto.start_time);
			analysis.created_at = new Date();
			analysis.updated_at = new Date();
			analysis.submit_time = new Date(dto.submit_time);
			analysis.response = item.response;
			await Analysis.save(analysis);
			// await analysis.save();

			// # Save choices
			const single_choice = item.single_choice;
			if (single_choice != null) {
				await this._save_choices(analysis, [
					single_choice.value,
					single_choice.sub_choice,
				]);
			}

			await this._save_choices(analysis, item.choices ?? []);

			// console.log(analysis.id);
			// await UserFeedbackMessage.update(
			// 	{ message_uuid: dto.message_uuid },
			// 	{ is_useless: false },
			// );
		}

		return true;
	}

	async stats(opts: {
		survey_id: number;
		email: string;
		language?: string;
		deployment: string;
	}) {
		const query = `
          WITH analysis AS (
              SELECT DISTINCT a.message_uuid, a.analyst_email, m.is_useless FROM uf_analysis a
              INNER JOIN uf_messages m ON m.message_uuid = a.message_uuid AND NOT m.test_deployment
                  AND m.language = $1 AND m.deploymentnumber = $4
              INNER JOIN uf_questions q ON q.survey_id = $3 AND q.id = a.question_id
          )
          SELECT
              (SELECT COUNT(*) FROM analysis WHERE analyst_email = $2) AS by_current_user,
              (SELECT count(*) FROM analysis) AS total_analysed,
              (
                  SELECT COUNT(*) FROM uf_messages m WHERE NOT m.test_deployment
                  AND m.language = $1 AND m.deploymentnumber = $4 AND is_useless
              ) AS total_useless,
              (
                  SELECT COUNT(*) FROM uf_messages m WHERE NOT m.test_deployment
                  AND m.language = $1 AND m.deploymentnumber = $4
              ) AS total_messages;
      `;
		const results = await Analysis.query(query, [
			opts.language,
			opts.email,
			opts.survey_id,
			opts.deployment ?? 1,
		]);

		// console.log(results);
		return {
			by_current_user: results[0].by_current_user,
			total_analysed: results[0].total_analysed,
			total_useless: results[0].total_useless,
			total_messages: results[0].total_messages,
		};
	}

	async generateReport(opts: {
		survey_id: number;
		deployment: string;
		language: string;
		message_id?: string;
	}) {
		const { survey_id, deployment, language, message_id } = opts;
		const query: FindOptionsWhere<Analysis> = {
			message: { deployment_number: deployment, language: language },
			question: { survey_id: survey_id },
		};
		if (message_id != null) {
			query.message_uuid = message_id;
		}

		const analysis = await Analysis.find({
			where: query,
			relations: {
				message: { recipient: true, content_metadata: true },
				choices: { choice: true },
				question: true,
			},
		});
		const questions = await Question.find({ where: { survey_id: survey_id } });

		// # Create row header, each header item must have unique key.
		// # The key is used to create the row.
		// # NOTE: This structure is used because https://www.npmjs.com/package/exceljs#rows
		// # library used by the frontend
		const excel_headers: Array<{
			header: string;
			key: string;
			width?: number;
		}> = [
			{ header: "Message", key: "message" },
			{ header: "Transcription", key: "transcription", width: 30 },
			{ header: "District", key: "district" },
			{ header: "Community", key: "community" },
			{ header: "Group", key: "group" },
			{ header: "Region", key: "region" },
			{ header: "Language", key: "language" },
			{ header: "Agent", key: "agent" },
		];
		for (const q of questions) {
			excel_headers.push({ header: q.question_label, key: q.id.toString() });
		}

		const excel_rows: Record<string, any> = [];

		// # Group analysis by message_uuid
		const grouped_analysis = groupBy(analysis, (a) => a.message_uuid);

		// # Create a row for each message, corresponding to the questions index
		for (const key in grouped_analysis) {
			const messages = grouped_analysis[key].sort(
				(a, b) => a.question_id - b.question_id,
			);
			const _row: Record<string, any> = {};

			for (const a of messages) {
				let value = a.response;

				// # For multiple/single choice response, combine the response into one value
				if (a.choices.length > 0) {
					value = a.choices.map((c) => c.choice.value).join(", ");
				}
				_row.transcription = a.message.transcription;
				_row[a.question_id] = value; // Set response value

				if (a.message.content_metadata != null) {
					_row.message = a.message.content_metadata.title;
				}

				if (a.message.recipient != null) {
					_row.district = a.message.recipient.district;
					_row.community = a.message.recipient.community_name;
					_row.group = a.message.recipient.group_name;
					_row.agent = a.message.recipient.agent;
					_row.language = a.message.recipient.language;
				}
			}

			excel_rows.push(_row);
		}
		return { headers: excel_headers, rows: excel_rows };
	}
}

export class AnalysisDto {
	@IsNotEmpty()
	@IsArray()
	questions: Record<string, any>[] = [];

	@IsNotEmpty()
	@IsString()
	message_uuid: string;

	@IsOptional()
	@IsEmail()
	analyst_email: string;

	@IsNotEmpty()
	@IsISO8601()
	submit_time: string;

	@IsNotEmpty()
	@IsISO8601()
	start_time: string;

	@IsOptional()
	@IsString()
	transcription?: string;

	@IsOptional()
	@IsBoolean()
	is_useless: boolean;

	/*
	 * Relevant only if the analysis is useless responses
	 */
	@IsOptional()
	@IsNumber()
	id?: number;
}
