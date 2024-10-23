import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { captureException } from "@sentry/nestjs";
import type { Request, Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const status = exception.getStatus();
		const exceptionResponse = exception.getResponse() as unknown as any;
		const message = (exceptionResponse as any).message;

		if (status === HttpStatus.BAD_REQUEST) {
			if (message != null) {
				if (message.constructor === Array && message.length > 0) {
					exceptionResponse.message = exceptionResponse.message[0];
					exceptionResponse.errors = exceptionResponse.message;
				}
			}
		}

    // 401 exceptions occurs frequently, no need to litter logs
		if (
			!(
				status === HttpStatus.UNAUTHORIZED &&
				exceptionResponse.message === "Invalid session token"
			)
		) {
			captureException(exception);
		}

		response.status(status).json(exceptionResponse);
	}
}
