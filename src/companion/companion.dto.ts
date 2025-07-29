import { IsISO8601, IsNotEmpty, IsNumber, IsString } from "class-validator";

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
