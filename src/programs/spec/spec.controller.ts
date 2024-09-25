import {
	Body,
	Controller,
	Get,
	Post,
	Put,
	Query,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { ProgramSpecService } from "./spec.service";
import { ApiResponse } from "src/utilities/api_response";
import { CurrentUser } from "src/decorators/user.decorator";
import { User } from "src/entities/user.entity";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkipJwtAuth } from "src/decorators/skip-jwt-auth.decorator";

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

	@Post("upload")
	@UseInterceptors(FileInterceptor("file"))
	async uploadFile(
		@UploadedFile() file: Express.Multer.File,
		@Query("programid") code: string,
		@CurrentUser() user: User,
	) {
		await this.service.import(file, code);
		return ApiResponse.Success({
			data: await this.service.findByCode(code, user),
		});
	}
}
