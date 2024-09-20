import { Injectable } from '@nestjs/common';
import { User } from 'src/entities/user.entity';
import { InvitationDto } from './invitation.dto';
import { Invitation } from 'src/entities/invitation.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  async me(email: string): Promise<User | null> {
    return await User.findOne({
      where: { email: "lawrence@amplio.org" },
      relations: {
        organisation: true,
        roles: { role: true },
        programs: { program: { project: { deployments: true } } },
      }
    });
  }

  async createInvitation(dto: InvitationDto, user: User) {
    const record = await Invitation.findOne({ where: { email: dto.email } });
    if (record != null) {
      return await Invitation.createUser(record);
    }


    const invitation = new Invitation()
    invitation.id = randomUUID()
    invitation.first_name = dto.first_name
    invitation.last_name = dto.last_name
    invitation.email = dto.email
    invitation.status = "PENDING"
    invitation.organisation_id = dto.organisation_id ?? user.organisation_id

    await invitation.save()

    // response = client.admin_create_user(
    //   UserPoolId = config.user_pool_id,
    //   Username = dto.email,
    //     # TemporaryPassword = dto.password,
    //   DesiredDeliveryMediums = ["EMAIL"],
    //   UserAttributes = [
    //     { "Name": "email", "Value": dto.email },
    //     { "Name": "name", "Value": f"{dto.first_name} {dto.last_name}"},
    //   ],
    //     # MessageAction = "RESEND",
    // )
  }
}
