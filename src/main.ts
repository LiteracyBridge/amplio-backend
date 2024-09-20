import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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
  await app.listen(8000);
}
bootstrap();
