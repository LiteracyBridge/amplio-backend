import { Controller, Get, Query } from "@nestjs/common";
import { TbLoaderService } from "./tb-loader.service";
import { CurrentUser } from "src/decorators/user.decorator";
import { User } from "src/entities/user.entity";
import { ApiResponse } from "src/utilities/api_response";

@Controller("tb-loader")
export class TbLoaderController {
	constructor(private service: TbLoaderService) {}

	@Get("reserve")
	async reserve(
		@Query("n") n: number,
		@Query("for-acm") forAcm: boolean,
		@CurrentUser() user: User,
	) {
		const result = await this.service.reserve(user, n);
		if (forAcm === true) {
			return { status: "ok", result };
		}

		return ApiResponse.Success({ data: result });
	}
}
