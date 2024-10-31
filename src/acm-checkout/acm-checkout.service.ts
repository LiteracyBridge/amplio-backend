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
import { ACMCheckout, ACMState } from "src/entities/checkout.entity";
import { User } from "src/entities/user.entity";
import { sendSes } from "src/utilities";
import { ILike, In } from "typeorm";

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

		// const acm_name = dto.db!; // name of ACM (e.g. 'ACM-FB-2013-01') - primary key of dynamoDB table
		const acm =
			opts.programCode == null
				? null
				: await ACMCheckout.findOne({
						where: {
							project: {
								code: ILike(opts.programCode.replace("ACM-", "")),
								program: { users: { user_id: currentUser.id } },
							},
						},
					});

		switch (action) {
			case CheckoutAction.list:
				return await this.listCheckouts(currentUser);
			case CheckoutAction.report:
				return await this.report(dto);
			case CheckoutAction.statuscheck:
				return this.statusCheck(acm, programCode);
			case CheckoutAction.checkout:
				return await this.checkout(acm, dto);
			case CheckoutAction.checkin:
				return await this.check_in(acm, dto);
			case CheckoutAction.discard:
				return await this.discard(acm, dto);
			case CheckoutAction.revokecheckout:
				return await this.revokeCheckout(acm);
			case CheckoutAction.create:
				return await this.create(acm, dto);
			case CheckoutAction.reset:
				return await this.reset(acm!, dto);
			default:
				return {
					status: STATUS_DENIED,
					response: "Unknown action requested",
				};
		}
	}

	private async reset(acm: ACMCheckout, dto: AcmCheckoutDto) {
		if (!acm.resettable) {
			return {
				data: STATUS_DENIED,
				status: STATUS_DENIED,
				error: "DB is not resettable",
			};
		}

		acm.acm_state = ACMState.CHECKED_IN;
		acm.last_in_file_name = dto.filename ?? "db1.zip"; // by convention, counts # of checkins
		acm.last_in_name = dto.name ?? "system";
		acm.last_in_contact = dto.contact ?? appConfig().emails.support; // phone number of requester
		acm.last_in_date = new Date();
		acm.last_in_version = dto.version; // current ACM version in format: r YY MM DD n (e.g. r1606221)
		acm.acm_comment = dto.comment; // to allow for internal comments if later required
		acm.now_out_key = dto.key;
		await acm.save();

		return {
			data: STATUS_OK,
			status: STATUS_OK,
			state: acm,
		};
	}

	private async create(_acm: ACMCheckout | null, dto: AcmCheckoutDto) {
		if (_acm != null) {
			// # Someone else released the record from under us. Count it as success.
			return {
				data: STATUS_DENIED,
				status: STATUS_DENIED,
				error: "DB already exists",
			};
		}

		const acm = new ACMCheckout();
		acm.acm_state = ACMState.CHECKED_IN;
		acm.last_in_file_name = dto.filename;
		acm.last_in_name = dto.name;
		acm.last_in_contact = dto.contact;
		acm.last_in_date = new Date();
		acm.last_in_version = dto.version;
		acm.acm_comment = dto.comment;
		acm.now_out_key = dto.key;
		await acm.save();

		return {
			data: STATUS_OK,
			status: STATUS_OK,
			state: acm,
		};
	}

	private async discard(acm: ACMCheckout | null, dto: AcmCheckoutDto) {
		if (
			acm == null
			// acm.acm_state === ACMState.CHECKED_IN ||
			// acm.now_out_key !== dto.key
		) {
			// # Someone else released the record from under us. Count it as success.
			return {
				data: STATUS_OK,
				status: STATUS_OK,
			};
		}

		if (acm.acm_state !== ACMState.CHECKED_OUT) {
			// # Someone else released the record from under us. Count it as success.
			return {
				data: STATUS_OK,
				status: STATUS_OK,
			};
		}

		acm.acm_state = ACMState.CHECKED_IN;
		acm.now_out_key = dto.key;
		await acm.save();

		return {
			data: STATUS_OK,
			status: STATUS_OK,
			state: acm,
		};
	}

	private async check_in(acm: ACMCheckout | null, dto: AcmCheckoutDto) {
    if (dto.key === "new") {
      return await this.newCheckIn(acm, dto);
		}

    if (acm == null) {
      return {
        response: "Create new ACM",
        data: STATUS_DENIED,
        status: STATUS_DENIED,
      };
    }

		if (acm.acm_state === ACMState.CHECKED_IN) {
			return {
				response: "ACM is already checked-in",
				data: STATUS_DENIED,
				status: STATUS_DENIED,
				state: acm,
			};
		}

		acm.last_in_file_name = dto.filename;
		acm.acm_state = ACMState.CHECKED_IN;
		acm.last_in_contact = acm.now_out_contact;
		acm.last_in_date = new Date();
		acm.last_in_version = dto.version;
		acm.now_out_key = dto.key;
		acm.last_in_name = dto.name;
		await acm.save();

		return {
			data: STATUS_OK,
			status: STATUS_OK,
			state: acm,
		};
	}

	/**
	 * Allows the user to create a new ACM by specifying the action as 'checkIn' and
	 * the key as 'new.' Only works for ACMs that do not already exist
	 */
	private async newCheckIn(acm: ACMCheckout | null, dto: AcmCheckoutDto) {
		if (acm != null) {
			return {
				response: "ACM already exists",
				data: STATUS_DENIED,
				status: STATUS_DENIED,
			};
		}

		// # parameters received from HTTPS POST request
		const newAcm = new ACMCheckout();
		newAcm.acm_state = ACMState.CHECKED_IN;
		newAcm.last_in_file_name = dto.filename; // tracks number of times ACM has been checked out, format db##.zip (e.g. db12.zip)
		newAcm.last_in_name = dto.name; // # name of requester
		newAcm.last_in_contact = dto.contact;
		newAcm.last_in_date = new Date();
		newAcm.acm_comment = dto.comment; // to allow for internal comments if later required
		await newAcm.save();

		return {
			response: "SUCCESS. Created new ACM",
			data: STATUS_OK,
			status: STATUS_OK,
		};
	}

	private async checkout(acm: ACMCheckout | null, dto: AcmCheckoutDto) {
		if (acm == null || acm.acm_state === ACMState.CHECKED_OUT) {
			return {
				response: "Unexpected Error",
				data: STATUS_DENIED,
				status: STATUS_DENIED,
			};
		}

		acm.acm_state = ACMState.CHECKED_OUT;
		acm.now_out_name = dto.name;
		acm.now_out_contact = dto.contact;
		acm.now_out_version = dto.version;
		acm.now_out_key = dto.key ?? Math.round(Math.random() * (10000000 - 1)).toString()
		acm.now_out_date = new Date();
		acm.now_out_comment = dto.comment;
		acm.now_out_computername = dto.computername;
		await acm.save();

		return {
			data: STATUS_OK,
			status: STATUS_OK,
			state: acm,
		};
	}
	/**
	 * Determine if the db exists, and if it does, can it be checked out.
	 * :return: 'available' if db is available for checkout, 'checkedout' if alreay  checked out, 'nodb' if no db.
	 */
	private statusCheck(acm: ACMCheckout | null, programCode: string) {
		if (acm == null) {
			return {
				status: "nodb",
				state: { acm_name: programCode },
			};
		}

		return {
			data: STATUS_OK,
			status: acm.acm_state === ACMState.CHECKED_OUT ? "checkedout" : STATUS_OK,
			state: acm,
		};
	}

	/**
	 * A successful 'revokeCheckOut' request deletes any ACM check-out entry from the db.
	 */
	private async revokeCheckout(acm: ACMCheckout | null) {
		if (acm == null) {
			return {
				response: "Unexpected Error",
				data: STATUS_DENIED,
				status: STATUS_DENIED,
			};
		}
		acm.acm_state = ACMState.CHECKED_IN;
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
			status: STATUS_OK,
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

export class AcmCheckoutDto {
	@IsOptional()
	@IsString()
	@Transform((value) => value.value.toLowerCase())
	@IsIn(Object.keys(CheckoutAction))
	action?: CheckoutAction;

	@IsOptional()
	@IsString()
	db?: string;

	@IsOptional()
	@IsString()
	program?: string;

	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	phone_number?: string;

	@IsOptional()
	@IsString()
	contact?: string;

	@IsOptional()
	@IsString()
	version?: string;

	@IsOptional()
	@IsString()
	computername?: string;

	@IsOptional()
	@IsString()
	key?: string;

	@IsOptional()
	@IsString()
	filename?: string;

	@IsOptional()
	@IsString()
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
