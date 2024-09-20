import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from 'src/decorators/user.decorator';
import { Invitation } from 'src/entities/invitation.entity';
import { Organisation } from 'src/entities/organisation.entity';
import { User } from 'src/entities/user.entity';
import { ApiResponse } from 'src/utilities/api_response';
import { FindOptionsWhere } from 'typeorm';
import { UsersService } from './users.service';
import { InvitationDto } from './invitation.dto';

@Controller('users')
export class UsersController {
  constructor(protected userService: UsersService) { }

  @Get("/organisations")
  async getOrganisations(
    @CurrentUser() user: User
  ) {
    return ApiResponse.Success({
      data: await Organisation.find({
        where: [{ id: user.organisation_id }, { parent_id: user.organisation_id }]
      })
    })
  }

  @Get("/me")
  async me(@CurrentUser() user: User) {
    return ApiResponse.Success({ data: user })
  }

  @Get("")
  async allUsers(@CurrentUser() user: User) {
    let query: any = {}
    if (user.organisation.isParent) {
      query = [{ organisation_id: user.organisation_id }, { organisation_id: user.organisation.parent_id }]
    } else {
      query = { organisation_id: user.organisation_id }
    }

    return ApiResponse.Success({
      data: await User.find({
        where: query,
        relations: { roles: { role: true }, organisation: true, programs: true }
      })
    })
  }

  @Get("/invitations")
  async allInvitations(@CurrentUser() user: User) {
    let query: any = {}
    if (user.organisation.isParent) {
      query = [{ organisation_id: user.organisation_id }, { organisation_id: user.organisation.parent_id }]
    } else {
      query = { organisation_id: user.organisation_id }
    }

    return ApiResponse.Success({
      data: await Invitation.find({
        where: query,
        relations: { organisation: true }
      })
    })
  }


  @Post("/invitations")
  async createInvite(
    @Body() body: InvitationDto,
    @CurrentUser() user: User
  ) {
    return ApiResponse.Success({
      data: await this.userService.createInvitation(body, user)
    })
  }


}
