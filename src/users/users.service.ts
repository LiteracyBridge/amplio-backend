import { Injectable } from '@nestjs/common';
import { User } from 'src/entities/user.entity';

@Injectable()
export class UsersService {
  async me(email: string): Promise<User | null> {
    return await User.findOne({
      where: { email: "lawrence@amplio.org" },
      relations: {
        roles: { role: true },
        programs: true,
        // programs: { program: { project: { deployments: true } } },
      }
    });
  }
}
