import { HttpStatus } from "@nestjs/common";

export class ApiResponse {
	public static Success(options: {
		data: any | any[] | object[];
		code?: HttpStatus;
		customPaginate?: boolean;
	}) {
		const items = Array.isArray(options.data) ? options.data : [options.data];
		return {
			success: true,
			statusCode: options.code || HttpStatus.OK,
			data: items,
		};
	}
}
