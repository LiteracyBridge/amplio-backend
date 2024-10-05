import { Injectable, NotFoundException } from "@nestjs/common";
import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Role } from "src/entities/role.entity";
import { User } from "src/entities/user.entity";
import { UserRole } from "src/entities/user_role.entity";
import { UsersService } from "./users.service";

@Injectable()
export class RolesService {
	constructor(private userService: UsersService) {}

	async getOrgRoles(user: User) {
		return Role.find({ where: { organisation_id: user.organisation_id } });
	}

	async create(user: User, dto: NewRoleDto) {
		const role = new Role();
		role.name = dto.name;
		role.permissions = dto.permissions;
		role.description = dto.description;
		role.organisation_id = user.organisation_id;
		await role.save();

		return this.getOrgRoles(user);
	}

	async assignOrUpdateRoles(opts: {
		current_user: User;
		roles: number[];
		user_id: number;
	}) {
		const user = await User.findOne({
			where: { id: opts.user_id },
			relations: { roles: true },
		});
		if (user == null) {
			throw new NotFoundException("User not found");
		}

		const existingRoles = new Set(user.roles.map((r) => r.role_id));
		for (const id of opts.roles) {
			if (!existingRoles.has(id)) {
				const role = new UserRole();
				role.user_id = user.id;
				role.role_id = id;
				await role.save();
			}
		}

		// Remove roles that are not in the new list
		for (const id of existingRoles) {
			if (opts.roles.indexOf(id) === -1) {
				await UserRole.delete({ user_id: user.id, role_id: id });
			}
		}

		return this.userService.allUsers(opts.current_user);
	}

	async revokeRole(opts: {
		currentUser: User;
		roleId: number;
		userId: number;
	}) {
		const role = await UserRole.findOne({
			where: { user_id: opts.userId, role_id: opts.roleId },
		});

		await role?.remove();
		return this.userService.allUsers(opts.currentUser);
	}

	async deleteRole(opts: { currentUser: User; roleId: number }) {
		const role = await Role.findOne({
			where: {
				id: opts.roleId,
				organisation_id: opts.currentUser.organisation_id,
			},
		});
		if (role == null) {
			throw new NotFoundException("Role not found");
		}

		await role.remove();
		return this.getOrgRoles(opts.currentUser);
	}
}

export class NewRoleDto {
	@IsNotEmpty()
	@IsString()
	name: string;

	@IsNotEmpty()
	@IsArray()
	permissions: Record<string, any[]>; // {"module": [permissions]}

	@IsOptional()
	@IsString()
	description?: string;
}
