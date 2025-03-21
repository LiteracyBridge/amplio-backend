import {
  BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
} from "@nestjs/common";
import { CurrentUser } from "src/decorators/user.decorator";
import { OrganisationProgram } from "src/entities/org_program.entity";
import { Program } from "src/entities/program.entity";
import { User } from "src/entities/user.entity";
import { ApiResponse } from "src/utilities/api_response";
import { In } from "typeorm";
import { ProgramsService } from "./programs.service";
import { ProgramUser } from "src/entities/program_user.entity";

@Controller("programs")
export class ProgramsController {
	constructor(private service: ProgramsService) {}

	@Get()
	async allPrograms(
		@CurrentUser() user: User,
		@Query("for-acm") forAcm?: boolean,
	) {
		if (forAcm) {
			return {
				result: {
					programs: await this.service.programsForACM(user),
					implicit_repository: "s3",
					status: "ok",
				},
			};
		}

		return ApiResponse.Success({ data: await this.service.getAll(user) });
	}

	@Get(":program_id/users")
	async programUsers(
		@Param("program_id") program_id: number,
		@CurrentUser() user: User,
	) {
		return ApiResponse.Success({
			data: await this.service.getProgramOrganisationUsers(user, program_id),
		});
	}

	@Post("organisations")
	async addOrgToProgram(
		@CurrentUser() user: User,
		@Body("program_id") program_id: number,
		@Body("organisation_id") organisation_id: number,
	) {
		const record =
			(await OrganisationProgram.findOne({
				where: { program_id, organisation_id },
			})) ?? new OrganisationProgram();

		record.organisation_id = organisation_id;
		record.program_id = program_id;
		await record.save();

		return ApiResponse.Success({ data: await this.service.getAll(user) });
	}

	@Delete(":program_id/organisations/:org_id")
	async removeOrgFromProgram(
		@Param("program_id") program_id: number,
		@Param("org_id") org_id: number,
		@CurrentUser() user: User,
	) {
		const record = await OrganisationProgram.findOne({
			where: { program_id, organisation_id: org_id },
		});
		if (record != null) {
			await record.remove();
			await ProgramUser.delete({
				program_id: program_id,
				user: { organisation_id: org_id },
			});
		}

		return ApiResponse.Success({ data: await this.service.getAll(user) });
	}

	@Post("users")
	async addUserToProgram(
		@CurrentUser() user: User,
		@Body("program_id") program_id: number,
		@Body("user_id") user_id: number,
	) {
		const record =
			(await ProgramUser.findOne({ where: { program_id, user_id } })) ??
			new ProgramUser();

		record.user_id = user_id;
		record.program_id = program_id;
		await record.save();

		return ApiResponse.Success({ data: await this.service.getAll(user) });
	}

	@Delete(":program_id/users")
	async removeUserFromProgram(
		@Param("program_id") program_id: number,
		@Query("user_id") userId: number,
		@CurrentUser() user: User,
	) {
    if(userId == null){
      throw new BadRequestException("User id is required in the query url")
    }

		await ProgramUser.delete({ program_id, user_id: userId });

		return ApiResponse.Success({ data: await this.service.getAll(user) });
	}
}
