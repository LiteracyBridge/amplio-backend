export default () =>
  ({
    tableau: {
      clientId: process.env.TABLEAU_CLIENT_ID,
      secretId: process.env.TABLEAU_SECRET_ID,
      secretValue: process.env.TABLEAU_SECRET_VALUE,
    },
    aws: {
      region: process.env.AWS_REGION || "us-west-2",
      secretId: process.env.AWS_SECRET_ID,
      poolId: process.env.AWS_USER_POOL_ID,
      poolClientId: (process.env.AWS_USER_POOL_CLIENT_ID || '').split(','),
    },
    buckets: {
      programSpec: "amplio-progspecs",
    },
    sentry: process.env.SENTRY_DSN,
  }) as const;
