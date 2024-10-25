import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AcmCheckoutDto, AcmCheckoutService } from "./acm-checkout.service";
import { CurrentUser } from "src/decorators/user.decorator";
import { User } from "src/entities/user.entity";
import { SkipJwtAuth } from "src/decorators/skip-jwt-auth.decorator";

@Controller("acm")
export class AcmCheckoutController {
	constructor(private readonly service: AcmCheckoutService) {}

	@Get()
	@Post()
	async handler1(
		@Body() body: AcmCheckoutDto,
		@Query() query: AcmCheckoutDto,
		@CurrentUser() user: User,
	) {
		const dto = new AcmCheckoutDto();
		// Merge the query and body into the dto
		Object.assign(dto, body, query);

		return await this.service.handleEvent({
			dto,
			currentUser: user,
			programCode: dto.program || dto.db,
		});
	}

	@Get(":action/:program")
	@Post(":action/:program")
	async handler2(
		@Body() body: AcmCheckoutDto,
		@Query() query: AcmCheckoutDto,
		@CurrentUser() user: User,
    @Param("action") action: string,
    @Param("program") program: string,
	) {
		const dto = new AcmCheckoutDto();
		// Merge the query and body into the dto
		Object.assign(dto, body, query);

    dto.program = program;
    // @ts-ignore
    dto.action = action.toLowerCase();

		return await this.service.handleEvent({
			dto,
			currentUser: user,
			programCode: dto.program
		});
	}

	@Get("report")
	@Post("report")
	async handlerReport(
		@Body() body: AcmCheckoutDto,
		@Query() query: AcmCheckoutDto,
		@CurrentUser() user: User,
	) {
		const dto = new AcmCheckoutDto();
		// Merge the query and body into the dto
		Object.assign(dto, body, query);

		return await this.service.handleEvent({
			dto,
			currentUser: user,
			programCode: dto.db || dto.program
		});
	}
}
