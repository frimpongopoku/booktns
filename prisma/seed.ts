import "dotenv/config";
import { db } from "../lib/db";
import {
  vendor,
  staff,
  services,
  products,
  bookings,
  orders,
  paymentMethods,
  videos,
} from "../lib/data";

async function main() {
  // Dev-only reset — wipe in reverse dependency order, then reseed from lib/data.ts.
  await db.bookingService.deleteMany();
  await db.orderItem.deleteMany();
  await db.booking.deleteMany();
  await db.order.deleteMany();
  await db.paymentMethod.deleteMany();
  await db.vendorVideo.deleteMany();
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
      active: vendor.active,
      createdAt: new Date(vendor.createdAt),
    },
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
        priceInPesewas: p.priceInPesewas,
        stockCount: p.stockCount,
        lowStockThreshold: p.lowStockThreshold,
        description: p.description,
        imageUrl: p.imageUrl,
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
