import { Controller, Get, Query } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import appConfig from 'src/app.config';
import { Program } from 'src/entities/program.entity';
import { ApiResponse } from 'src/utilities/api_response';
import * as jws from 'jws';

@Controller('tableau')
export class TableauController {
  @Get("jwt")
  async getJwt(
    @Query("program_id") programId: string
  ) {
    const program = await Program.findOne({ where: { program_id: programId } });
    if (program == null) {
      return ApiResponse.Success({ data: [] })
    }

    const claims = {
      "iss": appConfig().tableau.clientId,
      "exp": Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour,
      "jti": randomUUID(),
      "aud": "tableau",
      "sub": program.tableau_id,
      "scp": ["tableau:views:embed", "tableau:metrics:embed"],
    }

    const signature = jws.sign({
      header: { alg: 'HS256', kid: appConfig().tableau.secretId, "iss": appConfig().tableau.clientId },
      payload: claims,
      secret: appConfig().tableau.secretValue,
    });

    return ApiResponse.Success({ data: signature })
  }
}
