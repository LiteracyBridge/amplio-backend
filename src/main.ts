import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from "body-parser";
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';

export async function bootstrap(startServer: boolean = true, expressApp?: Express) {
  let app: INestApplication;

  if (expressApp != null) {
    app = await NestFactory.create(
      AppModule, new ExpressAdapter(expressApp)
    );
  } else {
    app = await NestFactory.create(AppModule);
  }

  app.enableCors({
    origin: [
      "http://localhost:8080",
      "http://localhost:4173",
      "https://suite.amplio.org",
      "https://suite-test.amplio.org",
    ]
  })

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

  if (startServer) {
    await app.listen(process.env.PORT || 8000);
  } else {
    app.init()
    return app
  }
}
bootstrap();
