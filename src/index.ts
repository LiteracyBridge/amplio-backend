
import { configure as serverlessExpress }  from '@codegenie/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { bootstrap } from './main';

let server: Handler;

async function bootstrapLambda(): Promise<Handler> {
  const app = await bootstrap(false)

  const expressApp = app!.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrapLambda());
  return server(event, context, callback);
};
