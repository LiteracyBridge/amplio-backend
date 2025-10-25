import { Type } from "class-transformer";
import {
	IsBoolean,
	IsISO8601,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
} from "class-validator";

export class CompanionStatisticsDto {
	@IsNotEmpty()
	@IsString()
	projectCode: string;

	// @IsNotEmpty()
	// @IsString()
	// deployment: string;

	@IsNotEmpty()
	@IsString()
	contentId: string;

	@IsNotEmpty()
	@IsString()
	deploymentName: string;

	@IsNotEmpty()
	@IsString()
	recipientId: string;

	@IsNotEmpty()
	@IsISO8601()
	timestamp: string;

	@IsNotEmpty()
	@IsString()
	deviceName: string;

	@IsNotEmpty()
	@IsNumber()
	listenedDuration: number;

	@IsNotEmpty()
	@IsNumber()
	audioDuration: number;

	@IsNotEmpty()
	@IsNumber()
	volume: number;

	@IsNotEmpty()
	@IsString()
	packageName: string;
}
export class SurveyResponseDto {
	@IsNotEmpty()
	@Type(() => Number)
	@IsNumber()
	id: string;

	@IsNotEmpty()
	@IsString()
	surveyId: string;

	@IsNotEmpty()
	@IsString()
	questionNo: string;

	@IsNotEmpty()
	@IsString()
	recipientId: string;

	@IsOptional()
	@IsString()
	response?: string;

	@IsNotEmpty()
	@IsString()
	packageName: string;

	@IsNotEmpty()
	@IsString()
	playlist: string;

	@IsNotEmpty()
	@IsString()
	project: string;

	@IsNotEmpty()
	@Type(() => Boolean)
	@IsBoolean()
	synced: boolean;

	@IsNotEmpty()
	@IsISO8601()
	createdAt: string;

	@IsNotEmpty()
	@IsISO8601()
	timestamp: string;

	@IsOptional()
	@IsString()
	recordingPath?: string;

	@IsNotEmpty()
	@IsString()
	deviceName: string;
}

export class RecipientDto {
	@IsNotEmpty()
	@IsString()
	recipientId: string;

	@IsNotEmpty()
	@IsString()
	name: string;

	@IsNotEmpty()
	@IsString()
	gender: string;

	@IsNotEmpty()
	@IsNumber()
	age: number;

	// @IsNotEmpty()
	// @IsNumber()
	// numberOfPeople: number;
}
