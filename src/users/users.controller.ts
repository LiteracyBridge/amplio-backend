import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "src/decorators/user.decorator";
// import { Invitation } from "src/entities/invitation.entity";
import { Organisation } from "src/entities/organisation.entity";
import { User, UserStatus } from "src/entities/user.entity";
import { ApiResponse } from "src/utilities/api_response";
import { UsersService } from "./users.service";
import { InvitationDto } from "./invitation.dto";


@Controller("users")
export class UsersController {
	constructor(private userService: UsersService) {}

	@Get("/organisations")
	async getOrganisations(@CurrentUser() user: User) {
		return ApiResponse.Success({
			data: await Organisation.find({
				where: [
					{ id: user.organisation_id },
					{ parent_id: user.organisation_id },
				],
			}),
		});
	}

	@Get("/me")
	async me(@CurrentUser() user: User) {
		return ApiResponse.Success({ data: user });
	}

	@Get()
	async allUsers(@CurrentUser() user: User) {
		return ApiResponse.Success({
			data: await this.userService.allUsers(user),
		});
	}

	@Get("/invitations")
	async allInvitations(@CurrentUser() user: User) {
		let query: any = {};
		if (user.organisation.isParent) {
			query = [
				{ organisation_id: user.organisation_id, status: UserStatus.INVITED },
				{ organisation_id: user.organisation.parent_id, status: UserStatus.INVITED },
			];
		} else {
			query = { organisation_id: user.organisation_id, status: UserStatus.INVITED };
		}

		return ApiResponse.Success({
			data: await User.find({
				where: query,
				relations: { organisation: true },
			}),
		});
	}

	@Post("/invitations")
	async createInvite(@Body() body: InvitationDto, @CurrentUser() user: User) {
		return ApiResponse.Success({
			data: await this.userService.createInvitation(body, user),
		});
	}
}
