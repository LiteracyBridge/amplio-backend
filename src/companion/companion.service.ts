import { Injectable, NotFoundException } from "@nestjs/common";
import { Recipient } from "src/entities/recipient.entity";


@Injectable()
export class CompanionAppService {
	async verifyRecipientCode(code: string) {
		const recipient = await Recipient.findOne({
			where: { access_code: code },
			relations: { project: true },
		});

		if (recipient == null) {
			throw new NotFoundException("Recipient code is invalid");
		}

		return {
			recipient: recipient,
			program: recipient.project,
		};
	}
}
