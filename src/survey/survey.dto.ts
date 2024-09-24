import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
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
