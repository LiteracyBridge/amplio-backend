import { Injectable } from "@nestjs/common";
import { User } from "src/entities/user.entity";
import { InvitationDto } from "./invitation.dto";
import { Invitation } from "src/entities/invitation.entity";
import { randomUUID } from "node:crypto";
import appConfig from "src/app.config";
import {
	AdminCreateUserCommand,
	AdminDeleteUserCommand,
	CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

@Injectable()
export class UsersService {
	async me(email: string): Promise<User | null> {
    // TODO: load permissions
		return await User.findOne({
			where: { email: email },
			relations: {
				organisation: true,
				roles: { role: true },
				programs: {
					program: { project: { deployments: true, languages: true } },
				},
			},
		});
	}

	async createInvitation(dto: InvitationDto, user: User) {
		const record = await Invitation.findOne({ where: { email: dto.email } });
		if (record != null) {
			return await Invitation.createUser(record);
		}

		const invitation = new Invitation();
		invitation.id = randomUUID();
		invitation.first_name = dto.first_name;
		invitation.last_name = dto.last_name;
		invitation.email = dto.email;
		invitation.status = "PENDING";
		invitation.organisation_id = dto.organisation_id ?? user.organisation_id;

		await invitation.save();

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
		const response = await client.send(command);
		console.log(response);

		return invitation;
	}

	async deleteInvitation(email: string) {
		const invite = await Invitation.findOne({ where: { email } });
		const user = await User.findOne({ where: { email } });

		if (invite != null && user != null) {
			// A/c already exists, delete the invitation
			await Invitation.remove(invite);
			return invite;
		}

		if (user == null && invite != null) {
			const command = new AdminDeleteUserCommand({
				UserPoolId: appConfig().aws.poolId, // required
				Username: email, // required
			});

			const response = await new CognitoIdentityProviderClient().send(command);
			console.log(response);

			await Invitation.remove(invite);
		}
		return invite;
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
