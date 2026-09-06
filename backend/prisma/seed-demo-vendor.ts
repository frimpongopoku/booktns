import "dotenv/config";
import { db } from "../src/common/lib/prisma-client";
import { vendor, staff, services, products, paymentMethods, videos } from "../src/common/lib/data";

// Creates the platform's public demo vendor ("Glam by Rose") — the one
// referenced by DEMO_VENDOR_SLUGS (excluded from superadmin platform stats)
// so it's meant to exist in production, not just local dev.
//
// This is deliberately NOT `prisma/seed.ts` reborn — that script (deleted in
// the NestJS cutover) started with deleteMany() calls that wiped every
// vendor, booking, and order before reseeding, which is why it could never
// run against production. This script only ever creates; it never deletes
// or updates anything. If a vendor with this slug already exists, it no-ops
// — safe to run in production as many times as you like.
//
// Storefront data only (vendor, hours, staff, services, products, payment
// methods, videos) — no sample bookings/orders, since those would show up
// as fake activity in a real dashboard rather than just populating the
// public storefront.
//
// Usage:
//   npm run seed:demo-vendor

async function main() {
  const existing = await db.vendor.findUnique({ where: { slug: vendor.slug } });
  if (existing) {
    console.log(`Vendor "${vendor.slug}" already exists (id ${existing.id}) — nothing to do.`);
    return;
  }

  const createdVendor = await db.vendor.create({
    data: {
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description,
      location: vendor.location,
      hours: vendor.hours,
      phone: vendor.phone,
      whatsapp: vendor.whatsapp,
      depositSetting: vendor.depositSetting,
      showOwnerName: vendor.showOwnerName,
      showOwnerPhone: vendor.showOwnerPhone,
      showOwnerEmail: vendor.showOwnerEmail,
      showVideoSection: vendor.showVideoSection,
      storefrontPublished: vendor.storefrontPublished,
      storefrontDisplayMode: vendor.storefrontDisplayMode,
      heroCardMode: vendor.heroCardMode,
      heroGalleryUrls: vendor.heroGalleryUrls,
      storefrontTheme: vendor.storefrontTheme,
      active: vendor.active,
      createdAt: new Date(vendor.createdAt),
    },
  });

  // Matches the demo vendor's free-text hours ("Mon–Sat 9am–7pm").
  await db.businessHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      vendorId: createdVendor.id,
      dayOfWeek,
      isClosed: dayOfWeek === 0,
      openTime: dayOfWeek === 0 ? null : "09:00",
      closeTime: dayOfWeek === 0 ? null : "19:00",
    })),
  });

  for (const s of staff) {
    await db.staff.create({
      data: {
        vendorId: createdVendor.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        roleDetail: s.roleDetail,
        botAccess: s.botAccess,
        active: s.active,
        serviceCategories: s.serviceCategories,
      },
    });
  }

  for (const svc of services) {
    await db.service.create({
      data: {
        vendorId: createdVendor.id,
        name: svc.name,
        category: svc.category,
        durationMinutes: svc.durationMinutes,
        priceInPesewas: svc.priceInPesewas,
        description: svc.description,
        active: svc.active,
        featured: svc.featured,
        displayOrder: svc.displayOrder,
      },
    });
  }

  for (const p of products) {
    await db.product.create({
      data: {
        vendorId: createdVendor.id,
        name: p.name,
        slug: p.slug,
        priceInPesewas: p.priceInPesewas,
        stockCount: p.stockCount,
        lowStockThreshold: p.lowStockThreshold,
        description: p.description,
        active: p.active,
        featured: p.featured,
      },
    });
  }

  for (const pm of paymentMethods) {
    await db.paymentMethod.create({
      data: {
        vendorId: createdVendor.id,
        type: pm.type,
        label: pm.label,
        accountName: pm.accountName,
        accountNumber: pm.accountNumber,
        bankName: pm.bankName,
        network: pm.network,
        active: pm.active,
        displayOrder: pm.displayOrder,
      },
    });
  }

  for (const video of videos) {
    await db.vendorVideo.create({
      data: {
        vendorId: createdVendor.id,
        title: video.title,
        description: video.description,
        durationSeconds: video.durationSeconds,
        gradientFrom: video.gradientFrom,
        gradientTo: video.gradientTo,
        url: video.url,
        displayOrder: video.displayOrder,
      },
    });
  }

  console.log(
    `Seeded vendor "${createdVendor.slug}" with ${staff.length} staff, ${services.length} services, ${products.length} products, ${paymentMethods.length} payment methods, ${videos.length} videos.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
