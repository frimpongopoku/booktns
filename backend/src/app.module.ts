import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./common/prisma/prisma.module";
import { SessionGuard } from "./common/guards/session.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { StorefrontModule } from "./modules/storefront/storefront.module";
import { HealthModule } from "./modules/health/health.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";

// Migrated so far. The Next.js API routes for everything NOT listed here are
// still live and still serving the dashboard — this is a strangler migration,
// not a big-bang cutover, so the app keeps working throughout. See
// MIGRATION.md for the remaining route inventory and the porting recipe.
@Module({
  imports: [PrismaModule, AuthModule, BookingsModule, StorefrontModule, HealthModule, FeedbackModule],
  providers: [
    // Global: every route is authenticated unless it opts out with
    // @Public(). That inverts the Next.js arrangement, where a route was open
    // unless the handler remembered to call requireRole — a forgotten call
    // there was an invisible hole; a forgotten decorator here is a 401.
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
