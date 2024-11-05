// console.ts - example of entrypoint
import { BootstrapConsole,  } from "nestjs-console";
import appConfig from "./app.config";
import { CommandsModule } from "./commands/commands.module";

const bootstrap = new BootstrapConsole({
	module: CommandsModule,
	useDecorators: true,
});
bootstrap.init().then(async (app) => {
	try {
    const Sentry = require("@sentry/nestjs");
    Sentry.init({ dsn: appConfig().sentry });

		await app.init();
		await bootstrap.boot();
		await app.close();
	} catch (e) {
		console.error(e);
		await app.close();
		process.exit(1);
	}
});
