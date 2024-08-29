# Roles and Permissions

## Overview

A role comprises of a set of permissions. An **administrator** role, for example, can consists of permission to manage user accounts, create or delete deployments,update program specification and manage programs. In addition, a user can be assigned multiple roles.

## Permissions Structure

To simply implementation, permission are grouped by their modules. For example,
the **statistics** module consists `view_tb_analytics` and `view_deployment_status` permissions. The permissions list can be found in [roles.py](https://github.com/LiteracyBridge/amplio-suite-api/blob/dev/src/utilities/roles.py#L7). Thus, a role consists of multiple modules and each module has one or more permissions.

Roles are created at the organisation level, and can be assigned **only** to users in that organisation.

## Permissions Checking in Code

The permissions are checked in the code using the `has_permission` method in the [permissions.py](https://github.com/LiteracyBridge/amplio-suite-api/blob/dev/src/utilities/permissions.py#L70) utility file. This method checks if the user has the required permission to perform the action. If the user does not have the required permission, an http ForbiddenException  is raised.

Querying for the current user `(GET <ur>/me)` returns the user's details including the roles and permissions. This is useful for the front-end/ACM to determine what actions the user can perform.

The `permissions` field is map, where the key is the action (or the actual permission) and the value is a boolean (always true). The map is a merge of all the permissions from all the roles assigned to the user. If the user has a permission from any of the roles, the permission is granted. Map was chosen as the data structure for fast lookups O(1) and to avoid duplicates in the permissions list.

```json
// Example of current user's response
{
  "email": "jane.doe@example",
  ..., // other user details
  "permissions": {
    "create_deployment": true,
    "delete_deployment": true,
    "update_deployment": true,
    "view_deployment": true,
  }.
}
```
