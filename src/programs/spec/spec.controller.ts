import {
	Body,
	Controller,
	Get,
	Post,
	Put,
	Query,
	Req,
	Res,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { ProgramSpecService } from "./spec.service";
import { ApiResponse } from "src/utilities/api_response";
import { CurrentUser } from "src/decorators/user.decorator";
import { User } from "src/entities/user.entity";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkipJwtAuth } from "src/decorators/skip-jwt-auth.decorator";
import { Request, Response } from "express";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";

@Controller("program-spec")
export class SpecController {
	constructor(private service: ProgramSpecService) {}

	@Get("content")
	async getContent(
		@Query("programid") code: string,
		@CurrentUser() user: User,
	) {
		return ApiResponse.Success({
			data: await this.service.findByCode(code, user),
		});
	}

	@Post("publish")
	async publish(@Query("programid") code: string, @CurrentUser() user: User) {
		return ApiResponse.Success({
			data: await this.service.publish({ code, email: user.email }),
		});
	}

	@Put("content")
	async updateContent(
		@Query("programid") code: string,
		@Body() dto: Record<string, any>,
		@CurrentUser() user: User,
	) {
		return ApiResponse.Success({
			data: await this.service.updateProgram(dto as any, code),
		});
	}

	// @Post("upload")
	// @UseInterceptors(
	// 	FileInterceptor("file", { dest: tmpdir(), preservePath: true }),
	// )
	// async uploadSpec(
	// 	@UploadedFile() file: Express.Multer.File,
	// 	@Query("programid") code: string,
	// 	@CurrentUser() user: User,
	// 	@Req() req: Request,
	// ) {
	// 	await this.service.import(file, code, req);
	// 	return ApiResponse.Success({
	// 		data: await this.service.findByCode(code, user),
	// 	});
	// }
}
