import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import axios from "axios";
import { Request } from "express";
import appConfig from "src/app.config";
import { UsersService } from "src/users/users.service";
import { hashString } from "src/utilities";
import { JWT_CACHE } from "src/utilities/constants";
import { SHOULD_SKIP_JWT_AUTH } from "src/decorators/skip-jwt-auth.decorator";
import { UserStatus } from "src/entities/user.entity";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private userServer: UsersService,
		private reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		const isPublic = this.reflector.getAllAndOverride<boolean>(
			SHOULD_SKIP_JWT_AUTH,
			[context.getHandler(), context.getClass()],
		);
		if (isPublic) return true;

    console.log(request.headers.authorization)
		const token = this.extractTokenFromHeader(request)?.trim();

		if (!token) {
			throw new UnauthorizedException();
		}

		const hash = hashString(token);
		if (JWT_CACHE[hash] != null) {
			request.user = JWT_CACHE[hash];
			return true;
		}

		// Verifier that expects valid access tokens:
		try {
			const jwksResponse = await axios.get(
				`https://cognito-idp.${appConfig().aws.region}.amazonaws.com/${appConfig().aws.poolId}/.well-known/jwks.json/`,
				{ timeout: 1000000000 },
			);
			// const response = await fetch(url); // Increase timeout to 10 seconds

			const verifier = CognitoJwtVerifier.create({
				userPoolId: appConfig().aws.poolId!,
				tokenUse: "id",
				clientId: appConfig().aws.poolClientId,
			});

			await verifier.cacheJwks(jwksResponse.data);

			const payload = await verifier.verify(token);
			const user = await this.userServer.me(payload.email as string);

			if (user == null) {
				throw new UnauthorizedException(
					"User account not be found! Reach out to support@amplio.org for assistance",
				);
			}

			if (user.status === UserStatus.INVITED) {
				user.status = UserStatus.ACTIVE;

				await user.save();
			}

			request.user = user;
			JWT_CACHE[hash] = request.user;

			return true;
		} catch (err) {
			console.error(err);
			throw new UnauthorizedException("Invalid session token");
		}
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(" ") ?? [];

		if (type != null && type !== "" && type !== "Bearer") {
			// Authorization: <token>
			return type;
		}

		return type === "Bearer" ? token : undefined; // Authorization: Bearer <token>
	}
}
