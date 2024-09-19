import { HttpStatus } from "@nestjs/common";
import { IsArray } from "class-validator";
import { PaginationOptionsDto } from "./pagination-options.dto";

export interface PageMetaDtoParameters {
	pageOptions: PaginationOptionsDto;
	itemsCount: number;
}

export class PaginationMetaDto {
	readonly itemsCount: number;

	readonly offset?: number;

	readonly limit: number;

	readonly pageCount: number;

	readonly page: number;

	readonly pagingCounter: number;

	readonly hasPrevPage: boolean;

	readonly hasNextPage: boolean;

	readonly prevPage?: number | null;

	readonly nextPage?: number | null;

	constructor({ pageOptions, itemsCount }: PageMetaDtoParameters) {
		this.page = pageOptions.page!;

		this.itemsCount = itemsCount;
	}
}

export class PaginationDto<T> {

	statusCode: number;

	success: boolean;

	@IsArray()
	readonly data: T[];

	readonly paginator: PaginationMetaDto;

	constructor(data: T[], paginator: PaginationMetaDto) {
		this.data = data;
		this.paginator = paginator;
	}
}

export class ApiResponseDto<T> {

	statusCode: number;


	success: boolean;


	@IsArray()
	readonly data: T;

	constructor(data: T) {
		this.data = data;
	}
}
