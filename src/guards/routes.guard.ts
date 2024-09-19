import {
  Company,
  Company as CompanyDocument,
} from "@schemas/primary/company.entity";
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { LoginActivity as $LoginActivity } from "@schemas/tenant/login_activity.entity";
import { AccountType, LoginActivityTokenStatus } from "@src/helpers/enums";
import { TenantHelpers } from "@src/helpers/tenant.helper";
import { AdminCompaniesService } from "../admin/companies/companies.service";
import { SHOULD_SKIP_JWT_AUTH } from "../decorators/skip-jwt-auth.decorator";
import { ApiKeyScope } from "@src/helpers/api-keys.helper";
import { Staff } from "@schemas/tenant/staff.entity";
import { Client } from "@schemas/tenant/client.entity";
import { MoreThan } from "typeorm";
import { ApiKey } from "@schemas/primary/api_key.entity";
import { CACHE } from "@src/config/config.module";

@Injectable()
export class RoutesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,

    @Inject(AdminCompaniesService)
    private companiesService: AdminCompaniesService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // TODO: move admin auth checks to admin guard
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      SHOULD_SKIP_JWT_AUTH,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const path: string = request.route.path;

    let company: CompanyDocument | undefined = undefined;

    // If the scope of the api key is client, ge the company
    // details from the associated app document
    if (request.apiKey?.scope === ApiKeyScope.CLIENT) {
      company = request.companyApp?.company as Company;
    }

    if (isPublic === true) {
      return true;
    }

    // If request path is not for admin
    // connect to tenant's database performing authorization checks
    // if (!isAdminPath && tenantId?.toLowerCase() !== "app") {
    const resp = await this.companiesService.findById(request.user.company);

    this.verifyCompany({
      fromReq: resp,
      fromApiKey: company,
      apiKey: request.apiKey as ApiKey,
    });
    // }

    if (request.headers.authorization == null && request.apiKey != null) {
      this.updateCache(request, request.apiKey.company);
      return this.setUser(path, request.apiKey.staff, request);
    }

    const activity = await $LoginActivity.findOne({
      where: {
        tokenId: request.user.sub,
        tokenExpiresAt: MoreThan(new Date()),
        tokenStatus: LoginActivityTokenStatus.ACTIVE,
      },
      relations: {
        staff: { branch: true },
        client: { branch: true },
        company: { country: true, currencies: true },
      },
      cache: true,
    });

    if (activity == null) {
      throw new UnauthorizedException(
        "Sorry, session has expired. Please login again.",
      );
    }

    activity.lastActivityAt = new Date();
    activity.save();

    CACHE.user[request.user.sub] ??= activity;
    this.updateCache(request, activity.company);

    const user = activity.staff ?? activity.client;
    return this.setUser(path, user!, request);
  }

  private setUser(path: string, user: Client | Staff, request: any) {
    // Verify the account is still active
    if (user != null) {
      ((user as Staff) ?? (user as Client))?.accountStatusCheck();
    } else {
      throw new UnauthorizedException("Sorry, account has been deactivated");
    }

    const accountType =
      (user as Staff).staffNo != null ? AccountType.STAFF : AccountType.CLIENT;
    request.user = (user as Staff).staffNo ? (user as Staff) : (user as Client);
    request.user.accountType = accountType;

    let regex = /^(\/api)?\/v\d\/(?:client)\//;
    if (path.match(regex) != null) {
      return accountType === AccountType.CLIENT;
    }

    regex = /^(\/api)?\/v\d\/(?:company)\//;
    if (path.match(regex) != null) {
      return accountType === AccountType.STAFF;
    }
    return true;
  }

  // private isTenantIdApp(tenantId?: string): boolean {
  //   return tenantId?.toLowerCase() == 'app';
  // }

  private updateCache(req: Request | any, company?: Company) {
    if (company == null) return

    CACHE.org[company.id] = {
      doc: company,
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      defaultCurrency: company.currencies.find(i => i.isDefault === true)!
    };
    req.company = company;
  }

  private verifyCompany(opts: {
    fromReq?: Company | null;
    fromApiKey?: Company | null;
    apiKey: Omit<ApiKey, "app">;
  }): boolean {
    // If the api key scope is client, verify that the user's company
    // matches the company associated with the key
    if (opts.fromApiKey != null && opts.fromReq != null) {
      if (
        opts.fromReq.id !== opts.fromApiKey.id &&
        opts.apiKey?.scope === ApiKeyScope.CLIENT
      ) {
        throw new UnauthorizedException();
      }
    }

    return true;
  }
}
