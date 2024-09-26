import serverlessExpress from '@codegenie/serverless-express';
import express from 'express';

import { bootstrap } from './main';

let cachedServer;

async function bootstrapLambda() {
  if (!cachedServer) {
    const expressApp = express();
    bootstrap(false, expressApp)

    cachedServer = serverlessExpress({ app: expressApp });
  }

  return cachedServer;
}

export const handler = async (event: any, context: any, callback: any) => {
  const server = await bootstrapLambda();

  return server(event, context, callback);
};
