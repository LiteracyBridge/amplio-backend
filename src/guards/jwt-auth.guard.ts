import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request } from "express";
import appConfig from "src/app.config";
import { User } from "src/entities/user.entity";
import { hashString } from "src/utilities";
import { JWT_CACHE } from "src/utilities/constants";

@Injectable()
export class AuthGuard implements CanActivate {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const hash = hashString(token)
    if (JWT_CACHE[hash] != null) {
      request.user = JWT_CACHE[hash];
      return true;
    }

    // Verifier that expects valid access tokens:
    const verifier = CognitoJwtVerifier.create({
      userPoolId: appConfig().aws.poolId,
      tokenUse: "access",
      clientId: appConfig().aws.poolClientId,
    });

    try {
      const payload = await verifier.verify(
        token
      );
      console.log(payload)
      request.user = await User.findOne({ where: { email: payload.username }, relations: [] })
      JWT_CACHE[hash] = request.user;

      return true
    } catch {
      console.log("Token not valid!");
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type != null && type !== '' && type !== 'Bearer') { // Authorization: <token>
      return type
    }

    return type === 'Bearer' ? token : undefined; // Authorization: Bearer <token>
  }
}
