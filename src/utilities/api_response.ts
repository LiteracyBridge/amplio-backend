// import { ValidationError } from "joi"
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  InternalServerErrorException,
} from "@nestjs/common";
// import { ValidationError as JoiError } from 'joi';
// import appConfig from "@src/config/app.config";
// import { captureException } from "@sentry/node";
// import { CaptureContext } from "@sentry/types";
import { PaginationAwareObject } from "./typeorm_pagination";
import { PaginationDto } from "./pagination-dto/pagination.dto";


// export const reportExceptionToSentry = async (
//   err: any,
//   captureContext?: CaptureContext,
// ) => {
//   const log: { sentryIssueId?: string; slackMessageLink?: string } = {
//     sentryIssueId: undefined,
//     slackMessageLink: undefined,
//   };

//   if (appConfig().sentry.enabled) {
//     log.sentryIssueId = captureException(err, captureContext);
//   }

//   return log;
// };

export class ApiResponse {
  public GenericResponse(code: number, data: any[], success = true) {
    return {
      success: success,
      statusCode: code,
      data: [...data],
    };
  }


  public static Success(options: {
    data: any | any[] | object[];
    code?: HttpStatus;
    customPaginate?: boolean;
  }) {
    const items = Array.isArray(options.data) ? options.data : [options.data];

    if (options.customPaginate === true) {
      const paginate = new PaginationDto(options.data, {
        itemsCount: items.length,
        limit: items.length,
        pageCount: 1,
        page: 1,
        pagingCounter: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
      paginate.success = true;
      paginate.statusCode = options.code ?? HttpStatus.OK;
      return paginate;
    }

    return {
      success: true,
      statusCode: options.code || HttpStatus.OK,
      data: items,
    };
  }

  public static WithPagination(data: PaginationAwareObject<any>, code = 200) {
    return {
      success: true,
      statusCode: code,
      ...data,
    };
  }

  public static InternalError(error: any) {
    // reportExceptionToSentry(error);

    // Joi validation error handler
    if (error?.details != null && Array.isArray(error.details)) {
      throw new BadRequestException(error.details[0].message);
    }

    switch (error.status as number) {
      case HttpStatus.CONFLICT:
        throw new ConflictException(error.response.message);
      default:
        throw new InternalServerErrorException(
          error.message ??
          "An unknown error occurred while processing request. Try again later",
        );
    }
  }
}
