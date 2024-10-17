import { Controller, Get, Query } from "@nestjs/common";
import { TbLoaderService } from "./tb-loader.service";
import { CurrentUser } from "src/decorators/user.decorator";
import { User } from "src/entities/user.entity";

@Controller("tb-loader")
export class TbLoaderController {
	constructor(private service: TbLoaderService) {}

	@Get("reserve")
	async reserve(@Query("n") n: number, @CurrentUser() user: User) {
		return await this.service.reserve(user, n);
	}
}
