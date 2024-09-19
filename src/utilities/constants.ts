import { User } from "src/entities/user.entity";

export const JWT_CACHE: { [jwtHash: string]: User } = {};
