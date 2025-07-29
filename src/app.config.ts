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
			poolClientId: (process.env.AWS_USER_POOL_CLIENT_ID || "").split(","),
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		},
		buckets: {
			programSpec: "amplio-progspecs",
			content: "amplio-program-content",
			userFeedback: "amplio-uf",
		},
		emails: {
			support: "techsupport@amplio.org",
		},
		sentry: process.env.SENTRY_DSN,
		ffmpeg: process.env.FFMPEG_PATH || "/usr/bin/ffmpeg",
	}) as const;
