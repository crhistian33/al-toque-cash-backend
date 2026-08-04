import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  // rawBody: true es necesario para poder verificar la firma svix
  // del webhook de Clerk en /api/auth/webhook
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:4321",
    credentials: true,
  });

  // Los DTOs se validan globalmente con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api/v1");

  const config = new DocumentBuilder()
    .setTitle("Al Toque Cash API")
    .setDescription("API para el exchange de divisas")
    .setVersion("1.0")
    .addTag("Al Toque Cash")
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `🚀 Backend AL TOQUE CA$H corriendo en http://localhost:${port}/api`,
  );
}
bootstrap();
