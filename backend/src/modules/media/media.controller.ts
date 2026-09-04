import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { CurrentSession, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { MediaService, parseTags } from "./media.service";
import { updateMediaSchema, MAX_FILE_SIZE_BYTES, type UpdateMediaDto } from "./media.schemas";

@Roles("Owner", "Management")
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@CurrentSession() session: SessionPayload, @Query("cursor") cursor?: string, @Query("search") search?: string) {
    return this.media.list(session.vendorId, cursor, search?.trim());
  }

  // Memory storage: files are re-encoded through sharp (compressImage) and
  // uploaded to R2 immediately, never written to the container's disk.
  @Post()
  @UseInterceptors(
    FilesInterceptor("files", 20, {
      storage: undefined,
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("tags") tagsField: string | undefined,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.media.upload(session.vendorId, files ?? [], parseTags(tagsField));
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMediaSchema)) dto: UpdateMediaDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.media.update(session.vendorId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentSession() session: SessionPayload) {
    return this.media.remove(session.vendorId, id);
  }
}
