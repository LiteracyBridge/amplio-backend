import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	Res,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { In } from "typeorm";
import { SkipJwtAuth } from "src/decorators/skip-jwt-auth.decorator";
import { CompanionAppService } from "./companion.service";
import { ApiResponse } from "src/utilities/api_response";
import { Response } from "express";
import { createReadStream } from "node:fs";
import { CompanionStatisticsDto, RecipientDto } from "./companion.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import appConfig from "src/app.config";
import { sendSes } from "src/utilities";
import { DeploymentMetadata } from "src/entities/deployment_metadata.entity";

// TODO: generate unique api key on verification, required in subsequent requests
@Controller("companion")
export class CompanionAppController {
	constructor(private readonly service: CompanionAppService) {}

	@SkipJwtAuth()
	@Post("recipients")
	async getRecipient(@Body("code") code: string) {
		return ApiResponse.Success({
			data: await this.service.verifyRecipientCode(code),
		});
	}

	@SkipJwtAuth()
	@Post("recipients/save")
	async saveRecipient(@Body() dto: RecipientDto) {
		return ApiResponse.Success({
			data: await this.service.saveRecipientInformation(dto),
		});
	}

	@SkipJwtAuth()
	@Get("packages/:id/prompts/:language")
	async getPrompts(
		@Param("id") id: string,
		@Param("language") language: string,
		@Res() res: Response,
	) {
		const path = await this.service.downloadPrompts(id, language);
		const file = createReadStream(path);
		file.pipe(res);
	}

	@SkipJwtAuth()
	@Get("packages/:id/contents/:language/:contentId")
	async getContent(
		@Param("id") id: string,
		@Param("language") language: string,
		@Param("contentId") contentId: string,
	) {
		const url = await this.service.downloadContent({ id, language, contentId });
		return ApiResponse.Success({ data: { url: url } });
	}

	@SkipJwtAuth()
	@Post("statistics")
	async trackStats(@Body() body: CompanionStatisticsDto[]) {
		await this.service.recordStats(body);
		return ApiResponse.Success({
			data: { message: "Statistics recorded successfully" },
		});
	}

	@SkipJwtAuth()
	@Post("user-feedback")
	@UseInterceptors(FileInterceptor("file"))
	async userFeedback(@UploadedFile() file: Express.Multer.File) {
		return ApiResponse.Success({
			data: { saved: await this.service.saveUserFeedback(file) },
		});
	}

	@SkipJwtAuth()
	@Post("ticket")
	async supportTicket(@Body("body") body: string) {
		await sendSes({
			fromaddr: appConfig().emails.support,
			subject: "Companion App Issue Ticket",
			body_text: body,
			recipients: [appConfig().emails.support],
			html: false,
		});

		return ApiResponse.Success({
			data: {},
		});
	}

	@SkipJwtAuth()
	@Get("library")
	async publicLibrary() {
		const packageIds: { id: string }[] = await DeploymentMetadata.query(`
      SELECT DISTINCT ON (meta.project_id) meta.id
      FROM deployment_metadata meta
      WHERE meta.published = true AND platform = 'CompanionApp'
      ORDER BY meta.project_id, meta.revision DESC;
    `);

		const metadata = await DeploymentMetadata.find({
			where: { id: In(packageIds.map((p) => p.id)) },
			relations: { project: true },
		});
		return ApiResponse.Success({
			data: metadata,
		});
	}
}
