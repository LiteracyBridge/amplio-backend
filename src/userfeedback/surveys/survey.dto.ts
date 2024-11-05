import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { SurveyStatus } from "src/entities/survey.entity";

export class SurveyDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  project_code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: SurveyStatus;
}

export class FormProps {
  @IsOptional()
  @IsBoolean()
  is_new?: boolean = false;

  @IsOptional()
  @IsBoolean()
  is_updated?: boolean = false;

  @IsOptional()
  @IsBoolean()
  is_deleted?: boolean = false;
}

class SectionDto extends FormProps {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  _id: string;

  @IsNotEmpty()
  @IsNumber()
  survey_id: number;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class QuestionItemDto extends FormProps {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  _id: string;

  @IsOptional()
  parent_id?: number;

  @IsOptional()
  section_id: string | number; // change to 'section'

  @IsNotEmpty()
  @IsString()
  question_label?: string;

  @IsNotEmpty()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  choices: Record<string, any>[]

  @IsOptional()
  conditions: Record<string, any>;

  @IsOptional()
  @IsArray()
  @Type(() => QuestionItemDto)
  @ValidateNested({ each: true })
  sub_questions: QuestionItemDto[]
}
export class QuestionsDto {
  @IsOptional()
  @IsArray()
  @Type(() => SectionDto)
  @ValidateNested({ each: true })
  sections?: SectionDto[];

  @IsOptional()
  @IsArray()
  @Type(() => QuestionItemDto)
  @ValidateNested({ each: true })
  questions?: QuestionItemDto[];
}
