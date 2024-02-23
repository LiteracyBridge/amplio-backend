# Roles and Permissions

## Overview

A role comprises of a set of permissions. An **administrator** role, for example, can consists of permission to manage user accounts, create or delete deployments,update program specification and manage programs. In addition, a user can be assigned multiple roles.

## Permissions Structure

To simply implementation, permission are grouped by their modules. For example,
the **statistics** module consists `view_tb_analytics` and `view_deployment_status` permissions. The permissions list can be found in [roles.py](https://github.com/LiteracyBridge/amplio-suite-api/blob/dev/src/utilities/roles.py#L7). Thus, a role consists of multiple modules and each module has one or more permissions.

Roles are created at the organisation level, and can be assigned **only** to users in that organisation.

## Permissions in User Object
