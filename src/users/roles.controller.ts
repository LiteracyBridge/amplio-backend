import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "src/decorators/user.decorator";
import { Invitation } from "src/entities/invitation.entity";
import { Organisation } from "src/entities/organisation.entity";
import { User } from "src/entities/user.entity";
import { ApiResponse } from "src/utilities/api_response";
import { FindOptionsWhere } from "typeorm";
import { UsersService } from "./users.service";
import { InvitationDto } from "./invitation.dto";
import { NewRoleDto, RolesService } from "./roles.service";
import { PERMISSIONS_TEMPLATE } from "src/entities/role.entity";

@Controller("roles")
export class RolesController {
	constructor(private service: RolesService) {}

	@Get()
	async orgRoles(@CurrentUser() user: User) {
		return ApiResponse.Success({
			data: await this.service.getOrgRoles(user),
		});
	}

	@Post()
	async createRole(@CurrentUser() user: User, @Body() body: NewRoleDto) {
		return ApiResponse.Success({
			data: await this.service.create(user, body),
		});
	}

	@Post("assign")
	async assignOrUpdateRoles(
		@CurrentUser() user: User,
		@Body("user_id") user_id: number,
		@Body("roles") roles: number[],
	) {
		return ApiResponse.Success({
			data: await this.service.assignOrUpdateRoles({
				current_user: user,
				roles,
				user_id,
			}),
		});
	}

	@Post("revoke")
	async revoke(
		@CurrentUser() user: User,
		@Body("user_id") user_id: number,
		@Body("role_id") role_id: number,
	) {
		return ApiResponse.Success({
			data: await this.service.revokeRole({
				currentUser: user,
				roleId: role_id,
				userId: user_id,
			}),
		});
	}

	@Delete("/:role_id")
	async deleteRole(
		@CurrentUser() user: User,
		@Body("role_id") role_id: number,
	) {
		return ApiResponse.Success({
			data: await this.service.deleteRole({
				currentUser: user,
				roleId: role_id,
			}),
		});
	}

	@Get("template")
	async template(@CurrentUser() user: User) {
		return ApiResponse.Success({ data: PERMISSIONS_TEMPLATE });
	}
}
