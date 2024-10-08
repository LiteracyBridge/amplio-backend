import { Injectable } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";
import { ACMCheckout } from "src/entities/checkout.entity";
import { User } from "src/entities/user.entity";
import { In } from "typeorm";

const STATUS_DENIED = "denied";
const STATUS_OK = "ok";

@Injectable()
export class AcmCheckoutService {
	async handleEvent(opts: {
		dto: AcmCheckoutDto;
		currentUser: User;
		programCode?: string;
		action?: CheckoutAction;
	}) {
		const { dto, currentUser } = opts;

		const programCode = (opts.programCode ?? dto.db ?? dto.program)!;
		const action = opts.action?.toLowerCase() ?? dto.action;

		if (action == null) {
			return {
				STATUS: STATUS_DENIED,
				response: "Unknown action requested",
			};
		}
		switch (action) {
			case CheckoutAction.list:
				return await this.listCheckouts(programCode, currentUser);
			default:
				return {
					STATUS: STATUS_DENIED,
					response: "Unknown action requested",
				};
		}
	}

	private async listCheckouts(programCode: string, user: User) {
		// ...
		const targets = user.programs.flatMap((p) => p.program.project_id);

		return {
			data: await ACMCheckout.find({
				where: {
					project_id: In(targets),
				},
				relations: { project: true },
			}),
			STATUS: STATUS_OK,
			response: "Success",
		};
	}
}

enum CheckoutAction {
	list = "list",
	report = "report",
	statuscheck = "statuscheck",
	checkout = "checkout",
	checkin = "checkin",
	discard = "discard",
	revokecheckout = "revokecheckout",
	create = "create",
	reset = "reset",
}

class AcmCheckoutDto {
	@IsOptional()
	@IsString()
	@Transform((value) => value.value.toLowerCase())
	@IsIn(Object.keys(CheckoutAction))
	action?: CheckoutAction;

	db?: string;
	program?: string;
	name?: string;
	phone_number: string;
	contact: string;
	version?: string;
	computername?: string;
	key?: string;
	filename?: string;
	comment?: string;
}
