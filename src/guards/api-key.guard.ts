import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { API_KEY_HEADER_NAME } from "@src/helpers/api-keys.helper";
import { SHOULD_SKIP_API_KEY_AUTH } from "../decorators/skip-api-key-auth.decorator";
import { JwtPayload, verify } from "jsonwebtoken";
import appConfig from "@src/config/app.config";
import * as bcrypt from "bcrypt";
import { CACHE } from "@src/config/config.module";
import { ApiKey } from "@schemas/primary/api_key.entity";
import { AdminCompaniesService } from "../admin/companies/companies.service";
import { Request } from "express";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      SHOULD_SKIP_API_KEY_AUTH,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) return true;

    const req: Request = context.switchToHttp().getRequest();
    const apiKey = req.headers[API_KEY_HEADER_NAME] as string;

    if (apiKey == null || apiKey?.length === 0) {
      throw new BadRequestException("No API key provided");
    }

    // If authorization  header is empty but api-key is set,
    // we assume the request is from an external api
    if (req.headers.authorization == null && apiKey != null) {
      await this.validateApiKey(req, apiKey);

      req.user = {
        company: req.apiKey.companyId,
      };

      return true;
    }
    return this.validateApiKey(req, apiKey);
  }

  private async validateApiKey(req: Request, apiKey: string) {
    let token: JwtPayload;

    try {
      token = verify(apiKey, appConfig().jwt.apiKeysJwtSecret, {
        ignoreExpiration: false,
        ignoreNotBefore: false,
      }) as JwtPayload;
    } catch (e) {
      throw new BadRequestException("Invalid API key");
    }

    const result = CACHE.apiKey[token.sub!] ?? await ApiKey.findOne({
      where: { keyId: token.sub },
      relations: {
        company: { country: true, config: true, currencies: true },
        staff: {
          permissions: true,
        },
      },
    });

    if (result != null && bcrypt.compareSync(apiKey, result.key)) {
      if (result.company != null) {
        req.company = result.company;
      }

      req.apiKey = result;
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      CACHE.apiKey[token.sub!] ??= result;

      return true;
    }

    throw new BadRequestException("Invalid API key");
  }
}
