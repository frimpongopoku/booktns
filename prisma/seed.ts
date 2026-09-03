import "dotenv/config";
import { db } from "../lib/db";
import { FIRST_SUPERADMIN_EMAIL } from "./first-superadmin";
import {
  vendor,
  staff,
  services,
  products,
  paymentMethods,
  videos,
} from "../lib/data";

// Booking/order sample data lives inline here rather than in lib/data.ts —
// the real /booking/[slug] and /order/[slug] pages and dashboard pages read
// live DB rows via app/api/bookings and app/api/orders, so lib/data.ts no
// longer needs to export these mocks at all; this seed script is the only
// place that still wants some.
const bookings = [
  {
    slug: "booking_seed0001",
    customerName: "Amara Johnson",
    customerPhone: "+2348055000001",
    customerEmail: "amara.johnson@example.com",
    services: [
      { serviceId: "svc1", name: "Knotless Braids", priceAtBooking: 35000, durationMinutes: 270 },
      { serviceId: "svc2", name: "Gel Manicure", priceAtBooking: 12000, durationMinutes: 90 },
    ],
    assignedStaffId: "s3",
    startTime: "2025-07-16T10:30:00Z",
    endTime: "2025-07-16T17:00:00Z",
    status: "confirmed" as const,
    notes: "Prefers medium-sized braids",
    depositAmountPesewas: 10000,
    seenByVendorAt: "2025-07-15T08:00:00Z",
    createdAt: "2025-07-14T14:32:00Z",
  },
  {
    slug: "booking_seed0002",
    customerName: "Zara Mohammed",
    customerPhone: "+2348055000002",
    customerEmail: "zara.mohammed@example.com",
    services: [{ serviceId: "svc3", name: "Facial Treatment", priceAtBooking: 20000, durationMinutes: 60 }],
    assignedStaffId: "s2",
    startTime: "2025-07-16T14:00:00Z",
    endTime: "2025-07-16T15:00:00Z",
    status: "pending" as const,
    notes: "",
    depositAmountPesewas: 0,
    seenByVendorAt: null,
    createdAt: "2025-07-15T09:10:00Z",
  },
  {
    slug: "booking_seed0003",
    customerName: "Blessing Eze",
    customerPhone: "+2348055000003",
    customerEmail: "blessing.eze@example.com",
    services: [{ serviceId: "svc4", name: "Lash Extensions", priceAtBooking: 15000, durationMinutes: 60 }],
    assignedStaffId: "s1",
    startTime: "2025-07-17T11:00:00Z",
    endTime: "2025-07-17T12:00:00Z",
    status: "confirmed" as const,
    notes: "First time client",
    depositAmountPesewas: 5000,
    seenByVendorAt: "2025-07-15T11:00:00Z",
    createdAt: "2025-07-15T10:45:00Z",
  },
  {
    slug: "booking_seed0004",
    customerName: "Ngozi Obi",
    customerPhone: "+2348055000004",
    customerEmail: "ngozi.obi@example.com",
    services: [{ serviceId: "svc5", name: "Pedicure", priceAtBooking: 10000, durationMinutes: 60 }],
    assignedStaffId: "s4",
    startTime: "2025-07-18T15:00:00Z",
    endTime: "2025-07-18T16:00:00Z",
    status: "pending" as const,
    notes: "",
    depositAmountPesewas: 0,
    seenByVendorAt: null,
    createdAt: "2025-07-15T16:20:00Z",
  },
];

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

  // The founding superadmin, ensured here purely so a freshly seeded dev
  // database can sign in to /superadmin without a second command.
  //
  // Note this is an UPSERT and sits *after* the deleteMany block above on
  // purpose: nothing in this seed ever deletes a SuperAdmin row, so running
  // the seed cannot revoke platform access. prisma/bootstrap-superadmin.ts
  // remains the production path — this seed wipes every vendor, booking, and
  // order and must never run against production.
  await db.superAdmin.upsert({
    where: { email: FIRST_SUPERADMIN_EMAIL },
    update: {},
    create: { email: FIRST_SUPERADMIN_EMAIL },
  });

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
        customerEmail: booking.customerEmail,
        assignedStaffId: staffIdByDummyId.get(booking.assignedStaffId),
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
        status: booking.status,
        notes: booking.notes,
        depositAmountPesewas: booking.depositAmountPesewas,
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
