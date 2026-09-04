import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { ServicesController, ProductsController } from "./catalog.controller";

@Module({
  controllers: [ServicesController, ProductsController],
  providers: [CatalogService],
})
export class CatalogModule {}
