import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentSession, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { CatalogService } from "./catalog.service";
import {
  createServiceSchema, updateServiceSchema, createProductSchema, updateProductSchema,
  type CreateServiceDto, type UpdateServiceDto, type CreateProductDto, type UpdateProductDto,
} from "./catalog.schemas";

@Roles("Owner", "Management")
@Controller("services")
export class ServicesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@CurrentSession() session: SessionPayload) {
    return this.catalog.listServices(session.vendorId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createServiceSchema)) dto: CreateServiceDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.catalog.createService(session.vendorId, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) dto: UpdateServiceDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.catalog.updateService(session.vendorId, id, dto);
  }

  @Delete(":id")
  archive(@Param("id") id: string, @CurrentSession() session: SessionPayload) {
    return this.catalog.archiveService(session.vendorId, id);
  }
}

@Roles("Owner", "Management")
@Controller("products")
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}

  // Registered before the cursor-paginated GET below in the same class —
  // Nest matches routes in declaration order, and "low-stock" would
  // otherwise never be reached if a bare GET / came first and Nest treated
  // it as a prefix match. (It's actually a sibling literal segment, not a
  // param, so order doesn't strictly matter here — kept first anyway so the
  // relationship reads clearly.)
  @Get("low-stock")
  lowStock(@CurrentSession() session: SessionPayload) {
    return this.catalog.lowStockProductNames(session.vendorId);
  }

  @Get()
  list(
    @CurrentSession() session: SessionPayload,
    @Query("cursor") cursor?: string,
    @Query("search") search?: string,
  ) {
    return this.catalog.listProducts(session.vendorId, cursor, search?.trim());
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.catalog.createProduct(session.vendorId, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.catalog.updateProduct(session.vendorId, id, dto);
  }

  @Delete(":id")
  archive(@Param("id") id: string, @CurrentSession() session: SessionPayload) {
    return this.catalog.archiveProduct(session.vendorId, id);
  }
}
