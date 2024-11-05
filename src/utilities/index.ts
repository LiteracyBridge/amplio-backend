import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { createHash } from "node:crypto";
import appConfig from "src/app.config";

export function hashString(input: string): string {
	return createHash("sha256").update(input).digest("hex");
}

/**
 * Format and send an ses message. Options are
 * html    - if true, send as html format
 * dry_run - if true, do not actually send email
 *
 * Example:
 *    send_ses('me@example.com, 'greetings', "Hi!", 'you@example.com)
 */
export async function sendSes(opts: {
	fromaddr: string;
	subject: string;
	body_text: string;
	recipients: string[];
	html?: boolean;
}) {
	const { fromaddr, subject, body_text, recipients, html } = opts;

	const message = {
		Subject: { Data: subject },
		Body:
			html ?? false
				? { Html: { Data: body_text } }
				: { Text: { Data: body_text } },
	};
	const client = new SESClient({ region: appConfig().aws.region });

	const command = new SendEmailCommand({
		Source: fromaddr,
		Destination: { ToAddresses: recipients },
		Message: message,
	});
	return await client.send(command);
}
