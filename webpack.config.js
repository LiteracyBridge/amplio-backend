const TerserPlugin = require("terser-webpack-plugin");
const nodeExternals = require("webpack-node-externals");

module.exports = (options, webpack) => {
	const lazyImports = [
		"@nestjs/microservices",
		"@nestjs/platform-express",
		"class-validator",
		"class-transformer",
		"@nestjs/typeorm",
		"@codegenie/serverless-express",
		"aws-lambda"
	];

	return {
		...options,
		externals: [nodeExternals()],
		optimization: {
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						keep_classnames: true,
					},
				}),
			],
		},
		output: {
			...options.output,
			libraryTarget: "commonjs2",
		},
		plugins: [
			...options.plugins,
			new webpack.IgnorePlugin({
				checkResource(resource) {
					if (lazyImports.includes(resource)) {
						try {
							require.resolve(resource);
						} catch (err) {
							return true;
						}
					}
					return false;
				},
			}),
		],
	};
};
