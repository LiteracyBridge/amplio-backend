import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as bodyParser from "body-parser";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { type Express } from "express";
import appConfig from "./app.config";
import { Logger } from "./logger";

export async function bootstrap(
	startServer: boolean = true,
	expressApp?: Express,
) {
	let app: INestApplication;

	if (expressApp != null) {
		app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
			logger: new Logger(),
		});
	} else {
		app = await NestFactory.create(AppModule, { logger: new Logger() });
	}

	app.getHttpServer().setTimeout(3 * 60 * 1000); // 3 minutes

	app.enableCors({
		origin: [
			"http://localhost:8080",
			"http://localhost:4173",
			"https://suite.amplio.org",
			"https://suite-test.amplio.org",
			"https://testapi.amplio.org",
		],
	});

	// Content Types
	app.use(bodyParser.json({ limit: "50mb" }));
	app.use(bodyParser.text({ type: "text/html", limit: "50mb" }));
	app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

	// enable global validation
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			stopAtFirstError: true,
			skipMissingProperties: false,
		}),
	);

	// Ensure to call this before requiring any other modules!
	const Sentry = require("@sentry/nestjs");
	Sentry.init({ dsn: appConfig().sentry });

	if (startServer) {
		await app.listen(process.env.PORT || 8000);
	} else {
		await app.init();
		return app;
	}
}
bootstrap();
