import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { Reflector } from "@nestjs/core";
import { AccountType } from "@src/helpers/enums";
import { SHOULD_SKIP_JWT_AUTH } from "../decorators/skip-jwt-auth.decorator";
import type { Staff } from "@schemas/tenant/staff.entity";
import type { Client } from "@schemas/tenant/client.entity";

@Injectable()
export class UserGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      SHOULD_SKIP_JWT_AUTH,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) return true;

    const user: Staff | Client = req.user;
    const accountType: AccountType = req.user.accountType;

    // TODO: verify this if still working after auth update
    // FIXME: Move admin auth check to admin guard
    // if (accountType === AccountTypes.ADMIN) {
    //   const user = await this.adminUserService.model.findById(req.user.id);

    //   if (user != null) {
    //     req.admin = user;
    //     CACHE.user = user;
    //     IAsyncStorage.enterWith({ admin: user as UserDocument });
    //     return true;
    //   }
    //   return false;
    // }

    if (accountType === AccountType.CLIENT) {
      req.clientAccount = user as any;
      // CACHE.client = user as any;
      // IAsyncStorage.enterWith({ client: user as any });
      return true;
    }

    if (accountType === AccountType.STAFF) {
      req.staff = user as any;
      // CACHE.staff = user as any;
      // CACHE.branch = user?.branch as any;
      // IAsyncStorage.enterWith({ staff: req.staff as any });

      return true;
    }

    return false;
  }
}
