import { Injectable, NotFoundException } from "@nestjs/common";
import {
	Survey,
	SurveyStatus,
} from "src/entities/survey.entity";
import { SurveySection } from 'src/entities/survey_section.entity';
import { QuestionsDto, SurveyDto } from "./survey.dto";
import { Question } from "src/entities/uf_question.entity";
import { Choice } from "src/entities/uf_choice.entity";

// {id: int, name: string}
@Injectable()
export class SurveyService {
	async createOrUpdate(dto: SurveyDto): Promise<Survey> {
		const survey = dto.id != null ? await this.findById(dto.id) : new Survey();
		const isNew = dto.id != null;

		survey.name ??= dto.name;
		survey.project_code ??= dto.project_code;
		survey.description ??= dto.description;
		survey.status ??= dto.status ?? SurveyStatus.draft;
		await survey.save();

		// Create default section
		if (!isNew) {
			const section = new SurveySection();
			section.name = "Untitled Section";
			section.survey_id = survey.id;
			await section.save();
		}

		return this.findById(survey.id);
	}

	async findById(id: number) {
		const survey = await Survey.findOne({
			where: { id },
			relations: {
				deployment: true,
				sections: true,
				questions: { choices: { sub_options: true } },
			},
		});

		if (survey == null) {
			throw new NotFoundException("Survey not found");
		}

		return survey;
	}

	async saveQuestions(dto: QuestionsDto, surveyId: number) {
		const survey = await this.findById(surveyId);
		dto.sections ??= [];
		dto.questions ??= [];

		for (let i = 0; i < dto.sections.length; i++) {
			const section_dto = dto.sections[i];

			// Delete removed sections from db
			if (
				(section_dto.is_deleted ?? false) &&
				!Number.isInteger(section_dto.id)
			) {
				await SurveySection.findOne({
					where: { id: section_dto.id, survey_id: survey.id },
				}).then((section) => section?.softRemove());
				continue;
			}

			section_dto.new_id = (
				await this.createSection(
					{ id: section_dto.id, name: section_dto.name },
					surveyId,
				)
			).id;
			dto.sections[i] = section_dto;
		}

		// Create/update questions
		for (let i = 0; i < dto.questions.length; i++) {
			const question_dto = dto.questions[i];

			// Delete removed questions from db
			if (
				(question_dto.is_deleted ?? false) &&
				!Number.isInteger(question_dto.id)
			) {
				await Question.findOne({ where: { id: question_dto.id } }).then(
					(question) => question?.softRemove(),
				);
				continue;
			}

			const question = new Question();
			question.id = question_dto.id;
			question.survey_id ??= surveyId;
			question.type = question_dto.type ?? "text";
			question.question_label =
				question_dto.question_label ?? "Untitled Question";
			question.order = question_dto.order ?? 0;
			question.conditions = question_dto.conditions ?? {};

			const parent_id = question_dto.parent_id;
			if (parent_id != null) {
				const _parent = await Question.findOne({ where: { id: parent_id } });
				if (_parent != null) {
					question.parent_id = _parent.id;
				} else {
					const _found = dto.questions.find((q) => q.id === parent_id);
					if (_found != null) {
						question_dto.parent_id = await this.createQuestion(
							surveyId,
							_found,
						).then((q) => q.id);
					} else {
						throw new NotFoundException(
							`Parent question of question ${question_dto.id} cannot be found!`,
						);
					}
				}
			}

			const sectionId = question_dto.section_id;
			if (sectionId != null) {
				const _section = (dto.sections ?? []).find(
					(s) => s.id === sectionId || s.new_id === sectionId,
				);
				if (_section != null) {
					question_dto.section_id = await SurveySection.findOne({
						where: { id: _section.new_id || _section.id },
					}).then((s) => s?.id);
					question.section_id = _section.id;
				}
			}

			await this.createQuestion(surveyId, question_dto).then((q) => q.id);
			return this.findById(surveyId);
		}
	}

	private async createQuestion(survey_id: number, dto: Record<string, any>) {
		let question = new Question();

		if (dto.id != null) {
			question =
				(await Question.findOne({ where: { id: dto.id } })) ?? new Question();
		}

		question.question_label = dto.question_label ?? "Untitled Question";
		question.survey_id = survey_id;
		question.type = dto.type ?? "text";
		question.order = dto.order ?? 0;
		question.required = dto.required ?? true;
		question.parent_id = dto.parent_id;
		question.conditions = dto.conditions;
		question.section_id = dto.section_id;

		await question.save();

		// Save options
		await this._create_or_update_choices({
			question: question,
			dto: dto.choices ?? [],
		});

		return question;
	}

	async _create_or_update_choices(opts: {
		question: Question;
		dto: Record<string, any>[];
		parent_choice_id?: number;
	}) {
		const { question, dto, parent_choice_id } = opts;

		for (let i = 0; i < dto.length; i++) {
			const option = dto[i];
			const option_id = option.choice_id;

			if ((option.is_deleted ?? false) && Number.isInteger(option_id)) {
				await Choice.delete({ choice_id: option_id });
				continue;
			}

			const choice =
				(await Choice.findOne({ where: { choice_id: option_id } })) ??
				new Choice();
			choice.value = option.value ?? "";
			choice.is_other = option.is_other ?? false;
			choice.question_id = question.id;
			choice.parent_id = parent_choice_id;

			// TODO: make the following nullable
			choice.choice_list = choice.value;
			choice.choice_label = choice.value;

			choice.order = option.order ?? i + 1;
			await choice.save();

			// Save sub options
			await this._create_or_update_choices({
				question: question,
				dto: option.sub_options ?? [],
				parent_choice_id: choice.choice_id,
			});
		}

		return question;
	}

	private async createSection(
		dto: { id?: number; name?: string },
		surveyId: number,
	) {
		const sectionId = dto.id;
		let section = new SurveySection();

		if (Number.isInteger(sectionId)) {
			section =
				(await SurveySection.findOne({ where: { id: sectionId } })) ??
				new SurveySection();
		}

		section.name ??= dto.name ?? "Untitled Section";
		section.survey_id ??= surveyId;
		await section.save();

		return section;
	}
}
