import { HttpStatus } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray } from "class-validator";
import { PaginationOptionsDto } from "./pagination-options.dto";

export interface PageMetaDtoParameters {
	pageOptions: PaginationOptionsDto;
	itemsCount: number;
}

export class PaginationMetaDto {
	@ApiProperty()
	readonly itemsCount: number;

	@ApiProperty()
	readonly offset?: number;

	@ApiProperty()
	readonly limit: number;

	@ApiProperty()
	readonly pageCount: number;

	@ApiProperty()
	readonly page: number;

	@ApiProperty()
	readonly pagingCounter: number;

	@ApiProperty()
	readonly hasPrevPage: boolean;

	@ApiProperty()
	readonly hasNextPage: boolean;

	@ApiProperty()
	readonly prevPage?: number | null;

	@ApiProperty()
	readonly nextPage?: number | null;

	constructor({ pageOptions, itemsCount }: PageMetaDtoParameters) {
		this.page = pageOptions.page!;

		this.itemsCount = itemsCount;
	}
}

export class PaginationDto<T> {
	@ApiProperty({
		description: "Request status code",
		example: HttpStatus.OK,
	})
	statusCode: number;

	@ApiProperty({
		description: "Whether the request was successful or not",
		example: true,
	})
	success: boolean;

	@ApiProperty()
	@IsArray()
	readonly data: T[];

	@ApiProperty({ type: () => PaginationMetaDto })
	readonly paginator: PaginationMetaDto;

	constructor(data: T[], paginator: PaginationMetaDto) {
		this.data = data;
		this.paginator = paginator;
	}
}

export class ApiResponseDto<T> {
	@ApiProperty({
		description: "Request status code",
		example: HttpStatus.OK,
	})
	statusCode: number;

	@ApiProperty({
		description: "Whether the request was successful or not",
		example: true,
	})
	success: boolean;

	@ApiProperty({
		description: "List of objects ",
		isArray: true,
	})
	@IsArray()
	readonly data: T;

	constructor(data: T) {
		this.data = data;
	}
}

export class BaseResponseDto {
	@ApiProperty({
		description: "Unique ID of the record",
		example: "619c0911b46b424f5f3e470f",
	})
	id: string;

	@ApiProperty({
		description: "Date & time at which the record was created",
		example: "2020-05-05T00:00:00.000Z",
	})
	createdAt: Date;

	@ApiProperty({
		description: "Date & time at which the record was updated",
		example: "2020-05-05T00:00:00.000Z",
	})
	updatedAt: Date;
}

export class ErrorResponseDto {
	@ApiProperty({ description: "Error code" })
	statusCode: number;

	@ApiProperty({
		description: "Error message",
		example: "Invalid email or password",
	})
	message: string;

	@ApiProperty({
		description: "Error Name",
		example: "ValidationError",
	})
	error: string;
}
