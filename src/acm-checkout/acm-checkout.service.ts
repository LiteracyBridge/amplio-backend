import { Injectable } from "@nestjs/common";
import { Transform } from "class-transformer";
import {
	IsBoolean,
	IsEmail,
	IsIn,
	IsOptional,
	IsString,
} from "class-validator";
import appConfig from "src/app.config";
import { ACMCheckout } from "src/entities/checkout.entity";
import { User } from "src/entities/user.entity";
import { sendSes } from "src/utilities";
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

		const acm_name = dto.db!; // name of ACM (e.g. 'ACM-FB-2013-01') - primary key of dynamoDB table

		switch (action) {
			case CheckoutAction.list:
				return await this.listCheckouts(currentUser);
			case CheckoutAction.report:
				return await this.report(dto);
			case CheckoutAction.statuscheck:
			// TODO: implement next
			case CheckoutAction.revokecheckout:
				return await this.revokeCheckout(acm_name, currentUser);
			default:
				return {
					status: STATUS_DENIED,
					response: "Unknown action requested",
				};
		}
	}

	/**
	 * A successful 'revokeCheckOut' request deletes any ACM check-out entry from the db.
	 */
	private async revokeCheckout(acm_name: string, user: User) {
		const acm = await ACMCheckout.findOne({
			where: {
				acm_state: "CHECKED_OUT",
				project: { code: acm_name, program: { users: { user_id: user.id } } },
			},
		});

		if (acm == null) {
			return {
				response: "Unexpected Error",
				data: STATUS_DENIED,
				status: STATUS_DENIED,
			};
		}
		acm.acm_state = "CHECKED_IN";
		await acm.save();

		return {
			response: "Deleted check out entry",
			data: STATUS_OK,
			status: STATUS_OK,
		};
	}

	private async listCheckouts(user: User) {
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

	private async report(dto: AcmCheckoutDto) {
		return await sendSes({
			fromaddr: dto.from ?? appConfig().emails.support,
			subject: dto.subject!,
			body_text: dto.body!,
			recipients: [dto.to ?? dto.recipient ?? appConfig().emails.support],
			html: dto.html ?? false,
		});
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

	@IsOptional()
	@IsString()
	subject?: string;

	@IsOptional()
	@IsBoolean()
	html?: boolean;

	/**
	 * Email body
	 */
	@IsOptional()
	@IsString()
	body?: string;

	/**
	 * Email from address
	 */
	@IsOptional()
	@IsString()
	@IsEmail()
	from?: string;

	/**
	 * Email to address
	 */
	@IsOptional()
	@IsString()
	@IsEmail()
	to?: string;

	/**
	 * Email to address
	 */
	@IsOptional()
	@IsString()
	@IsEmail()
	recipient?: string;
}
