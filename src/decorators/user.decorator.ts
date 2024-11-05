import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { User } from "src/entities/user.entity";

export const CurrentUser = createParamDecorator(
	(data: any, ctx: ExecutionContext): User => {
		const request = ctx.switchToHttp().getRequest();
		return request.user;
	},
);
