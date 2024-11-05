import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";

@Module({
	providers: [UsersService, RolesService],
	controllers: [UsersController, RolesController],
	exports: [UsersService],
})
export class UsersModule {}
