import { SetMetadata } from "@nestjs/common";
import {
	PermissionActions,
	PermissionSubjectType,
} from "@src/helpers/permissions.helper";

export const CHECK_PERMISSION_KEY = "check_permission";

// export const CheckPermission = (...handlers: PermissionHandler[]) =>
//   SetMetadata(CHECK_PERMISSION_KEY, handlers);

export const RequiredPermission = (permission: {
	[subject: PermissionSubjectType | string]: PermissionActions;
}) => SetMetadata(CHECK_PERMISSION_KEY, permission);
