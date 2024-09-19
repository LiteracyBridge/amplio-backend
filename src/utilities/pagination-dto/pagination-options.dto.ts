import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationOptionsDto {

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	// @Max(300)
	limit: number = 100;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@IsOptional()
	page?: number = 1;
}
