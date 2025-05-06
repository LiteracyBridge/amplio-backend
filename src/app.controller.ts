import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiResponse } from "./utilities/api_response";
import { Language } from "./entities/language.entity";

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get("languages/supported")
	async getCategories() {
		return ApiResponse.Success({ data: await Language.find() });
	}

	getHello(): string {
		return this.appService.getHello();
	  }
}