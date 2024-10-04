import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
} from "@nestjs/common";
import { Analysis } from "src/entities/analysis.entity";
import { ContentMetadata } from "src/entities/content_metadata.entity";
import { Message } from "src/entities/message.entity";
import { Recipient } from "src/entities/recipient.entity";
import { UserFeedbackMessage } from "src/entities/uf_message.entity";
import { ApiResponse } from "src/utilities/api_response";

const MINIMUM_SECONDS_FILTER = 0; // filters out any UF messages of less than this # of seconds
const MAXIMUM_MINUTES_CHECKOUT = 5; // re-issues the same UUID after this many minutes if the form hasn't yet been submitted

@Controller("messages")
export class UfMessagesController {
	@Get(":program_id")
	async getMessage(
		@Param("program_id") programId: string,
		@Query("deployment") deployment: string,
		@Query("language") language: string,
		@Query("skipped_messages") skipped_messages: string,
	) {
		if (deployment == null && language == null) {
			throw new BadRequestException("Deployment and language are required");
		}

		const skip: string[] =
			(skipped_messages || "")?.split(",").filter((l) => l !== "") ?? [];
		let result = await UserFeedbackMessage.createQueryBuilder("uf_messages")
			.where("uf_messages.programid = :program", { program: programId })
			.andWhere("uf_messages.deploymentnumber = :deployment", { deployment })
			.andWhere("uf_messages.language = :language", { language })
			.andWhere("uf_messages.length_seconds >= :length", {
				length: MINIMUM_SECONDS_FILTER,
			})
			.andWhere(
				"(uf_messages.is_useless IS FALSE OR uf_messages.is_useless IS NULL)",
			)
      if(skip.length > 0 ){
        result = result			.andWhere("uf_messages.message_uuid NOT IN (:...skip)", {
          skip: skip,
        })
      }

	result =result		.leftJoinAndMapMany(
				"uf_messages.analysis",
				Analysis,
				"analysis",
				"uf_messages.message_uuid = analysis.message_uuid",
			)
      .leftJoinAndMapOne(
				"uf_messages.recipient",
				Recipient,
				"recipient",
				"uf_messages.recipientid = recipient.recipientid",
			)
			.leftJoinAndMapOne(
				"uf_messages.content_metadata",
				ContentMetadata,
				"content_metadata",
				"uf_messages.relation = content_metadata.contentid",
			)
			.orderBy("uf_messages.message_uuid")
      .limit(1)

      console.log( await result.getMany())
		return ApiResponse.Success({ data: (await result.getMany() ).map((m) => {
      return {
        ...m,
        url: `https://amplio-uf.s3.us-west-2.amazonaws.com/collected/${m.program_id}/${m.deployment_number}/${m.message_uuid}.mp3`
      }
    })
  });
	}

	@Get(":program_id/samples")
	async getMessageSamples(
		@Param("program_id") programId: string,
		@Query("deployment") deployment: string,
		@Query("language") language: string,
	) {
		if (deployment == null && language == null) {
			throw new BadRequestException("Deployment and language are required");
		}

		const total = await UserFeedbackMessage.createQueryBuilder("uf_messages")
			.where("uf_messages.programid = :program", { program: programId })
			.andWhere("uf_messages.deploymentnumber = :deployment", { deployment })
			.andWhere("uf_messages.language = :language", { language })
			.getCount();

		const result = await UserFeedbackMessage.createQueryBuilder("uf_messages")
			.where("uf_messages.programid = :program", { program: programId })
			.andWhere("uf_messages.deploymentnumber = :deployment", { deployment })
			.andWhere("uf_messages.language = :language", { language })
			.andWhere(
				"(uf_messages.is_useless IS FALSE OR uf_messages.is_useless IS NULL)",
			)
			.orderBy("RANDOM()")
			.limit(total)
			.leftJoinAndMapOne(
				"uf_messages.recipient",
				Recipient,
				"recipient",
				"uf_messages.recipientid = recipient.recipientid",
			)
			.leftJoinAndMapOne(
				"uf_messages.content_metadata",
				ContentMetadata,
				"content_metadata",
				"uf_messages.relation = content_metadata.contentid",
			)
			.getMany();

		return ApiResponse.Success({ data: result });
	}

	@Post(":program_id/transcribe")
	async transcribeMessage(
		@Param("program_id") programId: string,
		@Body("message_id") message_id: string,
		@Body("transcription") transcription: string,
	) {
		const message = await UserFeedbackMessage.update(
			{ message_uuid: message_id, program_id: programId },
			{ transcription: transcription },
		);

		return ApiResponse.Success({ data: message });
	}

	@Get(":program_id/not-feedback/:message_id")
	async notFeedback(
		@Query("program_id") programId: string,
		@Body("message_id") message_id: string,
	) {
		const message = await UserFeedbackMessage.update(
			{ message_uuid: message_id, program_id: programId },
			{ is_useless: true },
		);

		return ApiResponse.Success({ data: message });
	}
}
