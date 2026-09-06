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
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { SuperAdminModule } from "./modules/superadmin/superadmin.module";

@Module({
  imports: [
    PrismaModule, RootModule, AuthModule, BookingsModule, StorefrontModule, HealthModule, FeedbackModule,
    CatalogModule, StaffModule, PaymentsModule, VideosModule, MediaModule, VendorModule, AvailabilityModule,
    SupportModule, CalendarModule, VerificationModule, OrdersModule, OverviewModule, OnboardingModule,
    SuperAdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
