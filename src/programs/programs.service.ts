import { Injectable } from '@nestjs/common';
import { Program } from 'src/entities/program.entity';
import { User } from 'src/entities/user.entity';

@Injectable()
export class ProgramsService {
  async getAll(user: User) {
    return await Program.find({
      where: {
        organisations: user.organisationQuery
      },
      relations: {
        project: true,
        organisations: { organisation: true },
        users: { user: true }
      }
    })
  }
}
