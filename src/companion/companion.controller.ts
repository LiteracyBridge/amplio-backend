import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { SkipJwtAuth } from "src/decorators/skip-jwt-auth.decorator";
import { CompanionAppService } from "./companion.service";
import { ApiResponse } from "src/utilities/api_response";
import { Response } from "express";
import { createReadStream } from "node:fs";

// TODO: generate unique api key on verification, required in subsequent requests
@Controller("companion")
export class CompanionAppController {
	constructor(private readonly service: CompanionAppService) {}

	@SkipJwtAuth()
	@Get(":code/recipient")
	async getRecipient(@Param("code") code: string) {
		return ApiResponse.Success({
			data: await this.service.verifyRecipientCode(code),
		});
	}

	@SkipJwtAuth()
	@Get("packages/:id/prompts/:language")
	async getPrompts(
		@Param("id") id: string,
		@Param("language") language: string,
    @Res() res: Response
	) {
    const path = await this.service.downloadPrompts(id, language)
    const file = createReadStream(path);
    file.pipe(res);
	}

	@SkipJwtAuth()
	@Get("packages/:id/playlist-prompts/:language")
	async getContents(
		@Param("id") id: string,
		@Param("language") language: string,
    @Res() res: Response
	) {
    const path = await this.service.downloadPrompts(id, language)
    const file = createReadStream(path);
    file.pipe(res);
	}
}
