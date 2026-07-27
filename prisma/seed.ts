import "dotenv/config";
import { db } from "../lib/db";
import {
  vendor,
  staff,
  services,
  products,
  bookings,
  paymentMethods,
  videos,
} from "../lib/data";

// Order sample data now lives inline here rather than in lib/data.ts — the
// real /order/[slug] page and dashboard Orders page read live DB rows via
// app/api/orders, so lib/data.ts no longer needs to export mock orders at
// all; this seed script is the only place that still wants some.
const orders = [
  {
    slug: "ord_seed0001aa",
    ref: "ORD-000001",
    customerName: "Tolu Adesanya",
    customerPhone: "+2348055000005",
    notes: "",
    deliveryPreference: "Pickup" as const,
    items: [
      { productId: "p1", name: "Argan Hair Oil", priceSnapshot: 8500, quantity: 2 },
      { productId: "p2", name: "Curl Defining Cream", priceSnapshot: 6500, quantity: 1 },
    ],
    totalPesewas: 23500,
    status: "new" as const,
    seenByVendorAt: null,
    createdAt: "2025-07-15T13:00:00Z",
  },
  {
    slug: "ord_seed0002bb",
    ref: "ORD-000002",
    customerName: "Sade Ibrahim",
    customerPhone: "+2348055000006",
    notes: "",
    deliveryPreference: "Pickup" as const,
    items: [{ productId: "p3", name: "Vitamin C Serum", priceSnapshot: 11000, quantity: 1 }],
    totalPesewas: 11000,
    status: "processing" as const,
    seenByVendorAt: "2025-07-15T14:00:00Z",
    createdAt: "2025-07-15T12:00:00Z",
  },
];

async function main() {
  // Dev-only reset — wipe in reverse dependency order, then reseed from lib/data.ts.
  await db.bookingService.deleteMany();
  await db.orderItem.deleteMany();
  await db.booking.deleteMany();
  await db.order.deleteMany();
  await db.paymentMethod.deleteMany();
  await db.vendorVideo.deleteMany();
  await db.businessHours.deleteMany();
  await db.product.deleteMany();
  await db.service.deleteMany();
  await db.staff.deleteMany();
  await db.vendor.deleteMany();

  const createdVendor = await db.vendor.create({
    data: {
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description,
      location: vendor.location,
      hours: vendor.hours,
      phone: vendor.phone,
      whatsapp: vendor.whatsapp,
      coverColor: vendor.coverColor,
      depositSetting: vendor.depositSetting,
      storefrontPublished: vendor.storefrontPublished,
      storefrontDisplayMode: vendor.storefrontDisplayMode,
      active: vendor.active,
      createdAt: new Date(vendor.createdAt),
    },
  });

  // Matches the demo vendor's prior free-text hours ("Mon–Sat 9am–7pm").
  await db.businessHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      vendorId: createdVendor.id,
      dayOfWeek,
      isClosed: dayOfWeek === 0,
      openTime: dayOfWeek === 0 ? null : "09:00",
      closeTime: dayOfWeek === 0 ? null : "19:00",
    })),
  });

  const staffIdByDummyId = new Map<string, string>();
  for (const s of staff) {
    const created = await db.staff.create({
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
    staffIdByDummyId.set(s.id, created.id);
  }

  const serviceIdByDummyId = new Map<string, string>();
  for (const svc of services) {
    const created = await db.service.create({
      data: {
        vendorId: createdVendor.id,
        name: svc.name,
        category: svc.category,
        durationMinutes: svc.durationMinutes,
        priceInPesewas: svc.priceInPesewas,
        description: svc.description,
        active: svc.active,
      },
    });
    serviceIdByDummyId.set(svc.id, created.id);
  }

  const productIdByDummyId = new Map<string, string>();
  for (const p of products) {
    const created = await db.product.create({
      data: {
        vendorId: createdVendor.id,
        name: p.name,
        slug: p.slug,
        priceInPesewas: p.priceInPesewas,
        stockCount: p.stockCount,
        lowStockThreshold: p.lowStockThreshold,
        description: p.description,
        active: p.active,
      },
    });
    productIdByDummyId.set(p.id, created.id);
  }

  for (const booking of bookings) {
    await db.booking.create({
      data: {
        vendorId: createdVendor.id,
        slug: booking.slug,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        assignedStaffId: booking.staffId ? staffIdByDummyId.get(booking.staffId) : null,
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
        status: booking.status,
        notes: booking.notes,
        depositAmountPesewas: booking.depositAmountPesewas,
        confirmedPdfUrl: booking.pdfUrl,
        seenByVendorAt: booking.seenByVendorAt ? new Date(booking.seenByVendorAt) : null,
        createdAt: new Date(booking.createdAt),
        services: {
          create: booking.services.map((bs) => ({
            serviceId: serviceIdByDummyId.get(bs.serviceId),
            name: bs.name,
            priceAtBooking: bs.priceAtBooking,
            durationMinutes: bs.durationMinutes,
          })),
        },
      },
    });
  }

  for (const order of orders) {
    await db.order.create({
      data: {
        vendorId: createdVendor.id,
        slug: order.slug,
        ref: order.ref,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        notes: order.notes,
        deliveryPreference: order.deliveryPreference,
        totalPesewas: order.totalPesewas,
        status: order.status,
        seenByVendorAt: order.seenByVendorAt ? new Date(order.seenByVendorAt) : null,
        createdAt: new Date(order.createdAt),
        items: {
          create: order.items.map((item) => ({
            productId: productIdByDummyId.get(item.productId),
            name: item.name,
            priceSnapshot: item.priceSnapshot,
            quantity: item.quantity,
          })),
        },
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
    `Seeded 1 vendor, ${staff.length} staff, ${services.length} services, ${products.length} products, ${bookings.length} bookings, ${orders.length} orders, ${paymentMethods.length} payment methods, ${videos.length} videos.`
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
