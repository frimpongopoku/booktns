import { Body, Controller, Get, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { CurrentSession, Roles } from "../../common/decorators";
import type { SessionPayload } from "../../common/session.types";
import { VerificationService } from "./verification.service";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Owner-only end to end — this is the owner's own government ID.
@Roles("Owner")
@Controller("verification")
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  status(@CurrentSession() session: SessionPayload) {
    return this.verification.status(session.vendorId);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: "idPhoto", maxCount: 1 }, { name: "selfiePhoto", maxCount: 1 }],
      { limits: { fileSize: MAX_IMAGE_BYTES } },
    ),
  )
  submit(
    @UploadedFiles() files: { idPhoto?: Express.Multer.File[]; selfiePhoto?: Express.Multer.File[] },
    @Body("legalName") legalName: string | undefined,
    @Body("ghanaCardNumber") ghanaCardNumber: string | undefined,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.verification.submit(session.vendorId, {
      legalName: legalName ?? "",
      ghanaCardNumber: ghanaCardNumber ?? "",
      idPhoto: files?.idPhoto?.[0],
      selfiePhoto: files?.selfiePhoto?.[0],
    });
  }
}
