import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
// import { AbilityFactory } from "@src/ability/ability.factory";
// import {
//   PermissionActions,
//   PermissionSubjectType,
// } from "@src/helpers/permissions.helper";

import { Observable } from "rxjs";
import { CHECK_PERMISSION_KEY } from "../decorators/permission.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    // private factory: AbilityFactory,
  ) { }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;

    // const permission = this.reflector.get<{
    //   [subject: PermissionSubjectType | string]: PermissionActions;
    // }>(CHECK_PERMISSION_KEY, context.getHandler());

    // const req = context.switchToHttp().getRequest();

    // return this.factory.createForUser(req.user, permission);
  }
}
