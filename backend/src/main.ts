import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { config } from "./common/config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: true });

  // The session lives in an httpOnly cookie, so it has to be parsed before
  // any guard can read it.
  app.use(cookieParser());

  // `credentials: true` plus an explicit origin list is mandatory, not
  // optional tuning: the browser refuses to send the session cookie on a
  // cross-origin request otherwise, and refuses a wildcard origin entirely
  // when credentials are involved. A missing entry here presents as "I'm
  // logged in but the API says I'm not".
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  // No global ValidationPipe: validation is Zod, applied per handler via
  // ZodValidationPipe. Nest's ValidationPipe pulls in class-validator and
  // would sit inert in front of DTOs that carry no decorators.
  app.setGlobalPrefix("api");

  await app.listen(config.port, "0.0.0.0");
  new Logger("Bootstrap").log(
    `API listening on :${config.port} — CORS origins: ${config.corsOrigins.join(", ")}`,
  );
}

void bootstrap();
