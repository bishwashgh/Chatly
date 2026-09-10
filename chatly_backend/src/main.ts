import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { graphqlUploadExpress } from 'graphql-upload';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 1 }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 4000);
  console.log(`Chatly API running on http://localhost:${process.env.PORT || 4000}/graphql`);
}
bootstrap();
