import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // TODO: report 500x errors to sentry

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

    response.status(status).json(exceptionResponse);
  }
}
