import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { createHash } from "node:crypto";
import appConfig from "src/app.config";
import * as unzipper from "unzipper";
import { createWriteStream } from "node:fs";
import {
	GetObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import path from "node:path";
import fs from "node:fs";

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
			(html ?? false)
				? { Html: { Data: body_text } }
				: { Text: { Data: body_text } },
	};
	const client = new SESClient({
		region: appConfig().aws.region,
		credentials: {
			accessKeyId: appConfig().aws.accessKeyId!,
			secretAccessKey: appConfig().aws.secretId!,
		},
	});

	const command = new SendEmailCommand({
		Source: fromaddr,
		Destination: { ToAddresses: recipients },
		Message: message,
	});
	return await client.send(command);
}

/**
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
export function zipDirectory(sourceDir: string, outputPath: string) {
	const AdmZip = require("adm-zip");
	const zip = AdmZip();
	zip.addLocalFolder(sourceDir); // Add the entire directory
	zip.writeZip(outputPath); // Write the ZIP file to disk
	console.log(
		`Directory "${sourceDir}" successfully zipped to "${outputPath}"`,
	);

	// const archive = archiver("zip", { zlib: { level: 9 } });
	// const stream = createWriteStream(outPath);

	// return new Promise<void>((resolve, reject) => {
	// 	archive
	// 		.directory(sourceDir, false)
	// 		.on("error", (err) => reject(err))
	// 		.pipe(stream);

	// 	stream.on("close", () => resolve());
	// 	archive.finalize();
	// });
}

export async function unzipFile(opts: {
	path: string | Buffer;
	destination: string;
}) {
	const directory = await unzipper.Open.buffer(opts.path);
	await directory.extract({ path: opts.destination });
}

export async function s3Sync(opts: {
	s3Key: string;
	destinationDir: string;
	bucket: string;
}): Promise<string[]> {
	console.log(opts);

	const s3Client = new S3Client({
		region: appConfig().aws.region,
		credentials: {
			accessKeyId: appConfig().aws.accessKeyId!,
			secretAccessKey: appConfig().aws.secretId!,
		},
	});

	// List all objects under the system prompts prefix
	const listObjects = async (prefix: string) => {
		const command = new ListObjectsV2Command({
			Bucket: opts.bucket,
			Prefix: prefix,
		});
		const response = await s3Client.send(command);
		return (
			(response.Contents?.map((obj) => obj.Key).filter(Boolean) as string[]) ??
			[]
		);
	};

	if (!fs.existsSync(opts.destinationDir)) {
		fs.mkdirSync(opts.destinationDir);
	}

	const downloadObject = async (key: string) => {
		const command = new GetObjectCommand({
			Bucket: opts.bucket,
			Key: key,
		});
		const response = await s3Client.send(command);
		const fileName = path.basename(key);
		const filePath = path.join(opts.destinationDir, fileName);

		if (fs.existsSync(filePath)) return filePath;

		const stream = response.Body as NodeJS.ReadableStream;
		const writeStream = fs.createWriteStream(filePath);
		await new Promise((resolve, reject) => {
			stream.pipe(writeStream);
			stream.on("end", resolve);
			stream.on("error", reject);
		});
		return filePath;
	};

	const promptKeys = await listObjects(opts.s3Key);
	console.log(promptKeys);

	const outputs: string[] = [];

	for (const objKey of promptKeys) {
		if (objKey.endsWith("/")) {
			// Directory download contents
			await s3Sync({
				s3Key: objKey,
				destinationDir: path.join(opts.destinationDir, path.basename(objKey)),
				bucket: opts.bucket,
			});
		} // skip folders

		const filePath = await downloadObject(objKey);
		outputs.push(filePath);
	}

	return outputs;
}
