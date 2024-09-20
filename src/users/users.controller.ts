import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from 'src/decorators/user.decorator';
import { Organisation } from 'src/entities/organisation.entity';
import { User } from 'src/entities/user.entity';
import { ApiResponse } from 'src/utilities/api_response';

@Controller('users')
export class UsersController {

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
}
