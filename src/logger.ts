import { ConsoleLogger } from "@nestjs/common";
import { Log } from "./entities/log.entity";
import { captureException } from "@sentry/nestjs";

export class Logger extends ConsoleLogger {
  // log(message: string, level?: string) {
  //   // Hide logs from InstanceLogger and RouterExplorer
  //   if (!/InstanceLogger|RouterExplorer/.test(message || '')) {
  //     super.log(message, level);
  //   }
  // }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  log(message: any, ...optionalParams: [...any, string?]): void {
    if ((optionalParams || []).length > 0) {
      const instance = optionalParams[0];

      if (
        !/InstanceLoader|RouterExplorer|RoutesResolver/.test(instance || "")
      ) {
        super.log(message, ...optionalParams);
      }
    } else {
      super.log(message, ...optionalParams);
    }
  }

  async toDb(opts: {
    message: string;
    tags?: string[];
    data?: string | object;
    extra?: string | object;
  }): Promise<Log | undefined> {
    const { message, tags, data } = opts;

    let console_message = message;
    const log = new Log();

    log.message = message;
    log.tags = (tags || []).join(",");

    if (typeof opts.extra === "object") {
      log.extra = JSON.stringify(opts.extra);
      console_message += `\n ${log.extra}`;
    } else {
      log.extra = opts.extra;
      console_message += `\n ${opts.extra}`;
    }

    if (typeof data === "object") {
      log.data = JSON.stringify(data);
      console_message += `\n ${log.data}`;
    } else {
      log.data = data;
      console_message += `\n ${log.data}`;
    }

    return log
      .save()
      .then((_) => log)
      .catch((e) => {
        captureException(e);
        return undefined;
      })
      .finally(() => {
        // @ts-ignore
        super.log(console_message, ...(opts.optionalParams || []));
      });
  }
}
