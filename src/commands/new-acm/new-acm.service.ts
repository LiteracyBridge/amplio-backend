import { Injectable } from "@nestjs/common";
import { Command, Console } from "nestjs-console";

// Interface Options {
//   option1?: any
//   option2: any
// }
@Console()
export class NewAcmService {
	@Command({
		command: "new-acm",
		description: "Creates a new ACM",
		options: [
			{
				flags: "-n, --name <name>",
				required: true,
				description: "What the customer calls the program.",
			},
			{
				flags: "--acm, <code>",
				required: true,
				description: "The project code",
			},
			{
				flags: "-o, --org <organisation>",
				required: true,
				description: "The customer running or sponsoring the program.",
			},
			{
				flags: "--parent-org <parent_organisation>",
				required: true,
				description: "The program's organization's parent.",
				defaultValue: "Amplio",
			},
			{
				flags: "--dry-run",
				required: false,
				description: "Don't update anything.",
			},
			{
				flags: "--do-content, --do-acm <none | check | both>",
				required: false,
				defaultValue: "both",
				description:
					"Do or don't create ACM directory. Options: check, update, none.",
			},
			{
				flags: "--do-sql <none | check | both>",
				required: false,
				defaultValue: "both",
				description:
					"Do or don't check or update projects table in PostgreSQL. Options: check, update, none.",
			},
			{
				flags: "--do-checkout <none | check | both>",
				required: false,
				defaultValue: "both",
				description: "Do or don't create a checkout record.",
			},
			{
				flags: "--do-progspec <none | check | both>",
				required: false,
				defaultValue: "both",
				description: "Do or don't check or create program specification.",
			},
			{
				flags: "--do-program <none | check | both>",
				required: false,
				defaultValue: "both",
				description: "Do or don't check or create a program record.",
			},
			{
				flags: "--do-organization <none | check | both>",
				required: false,
				defaultValue: "both",
				description: "Do or don't check or create an organization record.",
			},
		],
	})
	async createAcm(options: any): Promise<void> {
		console.log(`Creating ACM in ${options["do-sql"]} mode`);
	}
}
