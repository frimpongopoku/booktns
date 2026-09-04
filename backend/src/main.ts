import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { config } from "./common/config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: true });

  // Permissive origin, credentials OFF — and those two go together.
  //
  // This API is cookie-blind (see modules/auth/session.service.ts). Every
  // browser request is either an unauthenticated public storefront read, or
  // carries a Bearer header attached server-side by the frontend's BFF proxy.
  // Nothing depends on a cross-origin cookie, so there is no reason to enable
  // credentials — and enabling them would force an origin allowlist that must
  // include every vendor's own custom domain, which is unknowable at deploy
  // time and silently breaks each new one until someone updates an env var.
  app.enableCors({
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  // No global ValidationPipe: validation is Zod, applied per handler via
  // ZodValidationPipe. Nest's ValidationPipe pulls in class-validator and
  // would sit inert in front of DTOs that carry no decorators.
  app.setGlobalPrefix("api");

  await app.listen(config.port, "0.0.0.0");
  new Logger("Bootstrap").log(`API listening on :${config.port}`);
}

void bootstrap();
