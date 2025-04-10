import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { SkipJwtAuth } from "src/decorators/skip-jwt-auth.decorator";
import { CompanionAppService } from "./companion.service";
import { ApiResponse } from "src/utilities/api_response";

@Controller("companion")
export class CompanionAppController {
	constructor(private readonly service: CompanionAppService) {}

	@SkipJwtAuth()
	@Get(":code/recipient")
	async getRecipient(@Param() code: string) {
		return ApiResponse.Success({
			data: await this.service.verifyRecipientCode(code),
		});
	}
}
