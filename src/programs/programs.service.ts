import { Injectable } from "@nestjs/common";
import { In } from "typeorm";
import { Program } from "src/entities/program.entity";
import { User } from "src/entities/user.entity";
import { Project } from "src/entities/project.entity";

@Injectable()
export class ProgramsService {
	async programsForACM(user: User) {
		console.log(user.permissions);
		const results = await Project.find({
			where: {
				program: {
					organisations: user.organisation.isParent
						? {
								organisation: [
									{ id: user.organisation_id },
									{ parent_id: user.organisation_id },
								],
							}
						: {
								organisation_id: user.organisation_id,
							},
				},
			},
		});

		// Restructure the results to the format expected by the ACM
		// {programs: {code: {roles: str, name: project_name}}}
		const data = {};
		for (const result of results) {
			data[result.code] = {
				roles: Object.keys(user.permissions).join(","),
				name: result.name,
			};
		}

    return data
	}

	async getAll(user: User) {
		return await Program.find({
			where: {
				organisations: user.organisation.isParent
					? {
							organisation: [
								{ id: user.organisation_id },
								{ parent_id: user.organisation_id },
							],
						}
					: {
							organisation_id: user.organisation_id,
						},
			},
			relations: {
				project: true,
				organisations: { organisation: true },
				users: { user: true },
			},
		});
	}

	async getProgramOrganisationUsers(user: User, program_id: number) {
		return await User.find({
			where: {
				organisation: user.organisation.isParent
					? [
							{ id: user.organisation_id, programs: { program_id } },
							{ parent_id: user.organisation_id, programs: { program_id } },
						]
					: {
							id: user.organisation_id,
						},
				// programs: { program_id },
			},
		});
	}
}
