import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationOptionsDto {
	@ApiProperty({
		description: "The number of items to return.",
		minimum: 1,
		default: 100,
		maximum: 300,
		required: false,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	// @Max(300)
	limit: number = 100;

	@ApiProperty({
		minimum: 1,
		default: 1,
	})
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@IsOptional()
	page?: number = 1;
}
