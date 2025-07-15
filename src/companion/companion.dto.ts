import { IsISO8601, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CompanionStatisticsDto {
	@IsNotEmpty()
	@IsString()
	project: string;

	@IsNotEmpty()
	@IsString()
	deployment: string;

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
	durationListened: number;

	@IsNotEmpty()
	@IsNumber()
	audioDuration: number;

	@IsNotEmpty()
	@IsNumber()
	volume: number;

	@IsNotEmpty()
	@IsString()
	packageId: string;
}
