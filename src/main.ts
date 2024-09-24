import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from "body-parser";
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(8000);
}
bootstrap();
