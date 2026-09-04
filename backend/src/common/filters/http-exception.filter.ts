import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

interface ErrorBody {
  error: string;
  code: string;
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ErrorBody).error === "string" &&
    typeof (value as ErrorBody).code === "string"
  );
}

// Every response this API produces on failure is `{ error, code }`. That is
// the contract the existing frontend already parses (`ApiErrorBody`), so the
// migration must not change it — Nest's default `{ statusCode, message }`
// shape would break every error path in the UI at once.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpException");

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // Thrown as `new ForbiddenException({ error, code })` — pass it through
      // untouched so handlers keep full control of the wording.
      if (isErrorBody(body)) {
        response.status(status).json(body);
        return;
      }

      response.status(status).json({
        error: typeof body === "string" ? body : exception.message,
        code: HttpStatus[status]?.toLowerCase() ?? "error",
      });
      return;
    }

    // Anything unhandled is a bug. Log it with the stack, but never leak the
    // message to the caller — it can carry connection strings and row data.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(500).json({
      error: "Something went wrong on our end. Please try again.",
      code: "internal_error",
    });
  }
}
