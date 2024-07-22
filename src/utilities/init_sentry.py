import sentry_sdk

from config import config


def init_sentry():
    if config.sentry_dsn is not None:
        sentry_sdk.init(
            dsn=config.sentry_dsn,
            environment=config.sentry_environment,
            integrations=[],
            #     # Set traces_sample_rate to 1.0 to capture 100%
            #     # of transactions for performance monitoring.
            #     # We recommend adjusting this value in production,
            #     # traces_sample_rate=1.0,
        )
