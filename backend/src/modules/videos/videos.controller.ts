import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentSession, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { VideosService } from "./videos.service";
import { createVideoSchema, updateVideoSchema, type CreateVideoDto, type UpdateVideoDto } from "./videos.schemas";

@Roles("Owner", "Management")
@Controller("videos")
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Get()
  list(@CurrentSession() session: SessionPayload) {
    return this.videos.list(session.vendorId);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createVideoSchema)) dto: CreateVideoDto, @CurrentSession() session: SessionPayload) {
    return this.videos.create(session.vendorId, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateVideoSchema)) dto: UpdateVideoDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.videos.update(session.vendorId, id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentSession() session: SessionPayload) {
    return this.videos.remove(session.vendorId, id);
  }
}
