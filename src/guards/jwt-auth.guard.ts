import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleJsonFetcher } from "aws-jwt-verify/https";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import axios from "axios";
import { Request } from "express";
import appConfig from "src/app.config";
import { Invitation } from "src/entities/invitation.entity";
import { User } from "src/entities/user.entity";
import { UsersService } from "src/users/users.service";
import { hashString } from "src/utilities";
import { JWT_CACHE } from "src/utilities/constants";


@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userServer: UsersService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request)?.trim();

    if (!token) {
      throw new UnauthorizedException();
    }

    const hash = hashString(token)
    if (JWT_CACHE[hash] != null) {
      request.user = JWT_CACHE[hash];
      return true;
    }

    // Verifier that expects valid access tokens:

    console.log(appConfig().aws.poolId, appConfig().aws.poolClientId)
    try {
      console.log(token)
      const jwksResponse = await axios.get(`https://cognito-idp.${appConfig().aws.region}.amazonaws.com/${appConfig().aws.poolId}/.well-known/jwks.json/`, {timeout: 1000000000});
      // const response = await fetch(url); // Increase timeout to 10 seconds

      const verifier = CognitoJwtVerifier.create({
        userPoolId: appConfig().aws.poolId,
        tokenUse: "id",
        clientId: appConfig().aws.poolClientId,
      });

      await verifier.cacheJwks(jwksResponse.data);

      const payload = await verifier.verify(token);
      console.log(payload)
      let user = await this.userServer.me(payload.email as string)

      if (user == null) {
        user = await Invitation.createUser(payload.email as string)

        if (user == null) {
          throw new UnauthorizedException();
        }
        user = await this.userServer.me(payload.email as string)
      }

      request.user = user
      JWT_CACHE[hash] = request.user;

      console.log(request.user)
      return true
    } catch (err) {
      console.log(err);
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
