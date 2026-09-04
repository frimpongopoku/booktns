import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./common/prisma/prisma.module";
import { SessionGuard } from "./common/guards/session.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { StorefrontModule } from "./modules/storefront/storefront.module";
import { HealthModule } from "./modules/health/health.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";
import { RootModule } from "./modules/root/root.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { StaffModule } from "./modules/staff/staff.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { VideosModule } from "./modules/videos/videos.module";
import { MediaModule } from "./modules/media/media.module";
import { VendorModule } from "./modules/vendor/vendor.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { SupportModule } from "./modules/support/support.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { VerificationModule } from "./modules/verification/verification.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { OverviewModule } from "./modules/overview/overview.module";

// Superadmin console (7 routes) is the one deliberate gap — see
// MIGRATION.md. Everything else the vendor dashboard and storefront need is
// here; the Next.js API routes for these are now dead code, kept only until
// the frontend cutover (see lib/api-client.ts consumers) is verified in
// production.
@Module({
  imports: [
    PrismaModule, RootModule, AuthModule, BookingsModule, StorefrontModule, HealthModule, FeedbackModule,
    CatalogModule, StaffModule, PaymentsModule, VideosModule, MediaModule, VendorModule, AvailabilityModule,
    SupportModule, CalendarModule, VerificationModule, OrdersModule, OverviewModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
