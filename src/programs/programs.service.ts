import { Injectable } from "@nestjs/common";
import { In } from "typeorm";
import { Program } from "src/entities/program.entity";
import { User } from "src/entities/user.entity";

@Injectable()
export class ProgramsService {
	async getAll(user: User) {
		return await Program.find({
			where: {
				organisations: user.organisation.isParent
					? { organisation_id: user.organisation_id }
					: {
							organisation_id: In([
								user.organisation.id,
								user.organisation.parent_id,
							]),
						},
			},
			relations: {
				project: true,
				organisations: { organisation: true },
				users: { user: true },
			},
		});
	}
}
