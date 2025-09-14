import { Injectable } from "@nestjs/common";
import { hrtime } from "node:process";
import { TalkingBookLoaderId } from "src/entities/tbloader-ids.entity";
import { User } from "src/entities/user.entity";

const DEFAULT_RESERVATION = 1024;
const MAX_VALUE = 65000;
const MAX_LOADER_KEY = "max-tbloader@@amplio.org";

@Injectable()
export class TbLoaderService {
	/**
	 * Reserve a block of TB serial numbers. If successful, returns a 'begin' and 'end',
	 * where begin is the first new serial number and end is one past the highest
	 * allocated serial number.
	 * :return:
	 *
	 * @param   {number}  n     The number of SRNs requested.
	 * @param   {User}    user  Current user
	 *
	 * @return  {[type]}        {status:'ok', begin:next_block, end:next_block+n, n:num_allocated, id:tbid, hexid:0xtbid} or {status:'failure', message:'some error message'}
	 */
	async reserve(user: User, n?: number) {
		const start = hrtime.bigint();
		const num = n ?? DEFAULT_RESERVATION;

		// See if there's an existing tbid for the email
		const tbid_data = await TalkingBookLoaderId.findOne({
			where: { email: user.email },
		});

		// if so, use it, otherwise try to allocate one
		let item: TalkingBookLoaderId | null = null;
		if (tbid_data != null) {
			item = tbid_data;
			const id = tbid_data.tb_loader_id ?? 0;
			const cur_value = tbid_data.reserved ?? 0;
			if (
				!((id && tbid_data.hex_id && cur_value) || cur_value + num > MAX_VALUE)
			) {
				item = null; // force allocation of a new id
			}
		}

		if (item == null) {
			const allocate_result = await this.allocate_tbid_item(user.email);
			if (allocate_result.status !== "ok") {
				return allocate_result;
			}
			item = allocate_result.item;
		}

		// verify that we have all of the required fields
		const id = item?.tb_loader_id ?? 0;
		const hex_id = item?.hex_id;
		const cur_value = item?.reserved ?? 0;
		if (!(id && hex_id && cur_value)) {
			return { status: "failure", message: `Missing values in ${item}` };
		}

		// we can now allocate the next block of tb ids
		const new_value = cur_value + num;
		// Update the reserve counter
		item!.reserved = new_value;
		await item!.save();

		// We return the old value. The caller can use old_value to old_value + n
		const end = hrtime.bigint();
		return {
			msg: "TB Id Reservation Utility",
			begin: cur_value,
			end: new_value,
			n: num,
			id: id,
			hexid: hex_id,
			msec: (Number(end) - Number(start)) / 1000000,
			status: "ok",
		};
	}

	private async allocate_tbid_item(email: string) {
		const result = { status: "failure", message: "", item: null };

		// Be sure we are able to read the previously allocated tbloader id.
		const max_tb_loader = await TalkingBookLoaderId.findOne({
			where: { email: MAX_LOADER_KEY },
		});
		if (max_tb_loader == null) {
			result.message = "Unable to read MAX_LOADER_KEY in tbloaderids";
			return result;
		}

		const old_max_id = max_tb_loader.max_tb_loader;
		if (old_max_id == null) {
			result.message = "Unable to retrieve max tbloader id from tbloaderids";
			return result;
		}

		// Allocate the new tbloader id and build the tbloadersid table item
		const new_max_id = old_max_id + 1;
		const new_item = new TalkingBookLoaderId();
		new_item.tb_loader_id = new_max_id;
		new_item.hex_id = new_max_id.toString(16).padStart(4, "0");
		new_item.email = email;
		new_item.reserved = 1;
		await new_item.save();

		max_tb_loader.max_tb_loader = new_max_id;
		await max_tb_loader.save();

		result.status = "ok";
		// @ts-ignore
		result.item = new_item;

		return result;
	}
}
