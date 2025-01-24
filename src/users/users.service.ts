import { BadRequestException, Injectable } from "@nestjs/common";
import { User, UserStatus } from "src/entities/user.entity";
import { InvitationDto } from "./invitation.dto";
// import { Invitation } from "src/entities/invitation.entity";
import appConfig from "src/app.config";
import {
	AdminCreateUserCommand,
	AdminDeleteUserCommand,
	CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { ProgramUser } from "src/entities/program_user.entity";

@Injectable()
export class UsersService {
	async me(email: string): Promise<User | null> {
		// TODO: load permissions
		const user = await User.findOne({
			where: { email: email },
			relations: {
				organisation: true,
				roles: { role: true },
				programs: {},
			},
		});

		if (user == null) {
			throw new BadRequestException("User not found");
		}

		user.programs = await ProgramUser.find({
			where: { user_id: user.id },
			relations: {
				program: {
					project: { deployments: true, languages: true },
					organisations: { organisation: true },
				},
			},
		});

		return user;
	}

	async createInvitation(dto: InvitationDto, user: User) {
		const newUser = new User();
		newUser.first_name = dto.first_name;
		newUser.last_name = dto.last_name;
		newUser.email = dto.email;
		newUser.status = UserStatus.INVITED;
		newUser.organisation_id = dto.organisation_id ?? user.organisation_id;
		await newUser.save();

		// Create user on cognito
		const client = new CognitoIdentityProviderClient();
		const command = new AdminCreateUserCommand({
			UserPoolId: appConfig().aws.poolId, // required
			Username: dto.email, // required
			UserAttributes: [
				// AttributeListType
				{ Name: "email", Value: dto.email },
				{ Name: "name", Value: `${dto.first_name} ${dto.last_name}` },
			],
			ValidationData: [],
			ForceAliasCreation: false,
			// MessageAction: "RESEND",
			DesiredDeliveryMediums: ["EMAIL"],
		});
		await client.send(command);

		return newUser;
	}

	async allUsers(currentUser: User) {
		let query: any = {};
		if (currentUser.organisation.isParent) {
			query = [
				{ organisation_id: currentUser.organisation_id },
				{ organisation_id: currentUser.organisation.parent_id },
			];
		} else {
			query = { organisation_id: currentUser.organisation_id };
		}

		return await User.find({
			where: query,
			relations: {
				roles: { role: true },
				organisation: true,
				programs: true,
			},
		});
	}
}
