import type {
  Service as PrismaService,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  Staff as PrismaStaff,
  Media as PrismaMedia,
  Vendor as PrismaVendor,
  VendorVideo as PrismaVendorVideo,
  PaymentMethod as PrismaPaymentMethod,
} from "@/lib/generated/prisma/client";
import type { Service, Product, Staff, Media, Vendor, VendorVideo, PaymentMethod } from "@/types";

// Prisma's nullable String? fields come back as `null`; our app types use
// `?: string` (undefined) at this boundary, matching the convention in lib/vendors.ts.
export function serializeService(service: PrismaService): Service {
  return { ...service, description: service.description ?? undefined };
}

export function serializeProduct(product: PrismaProduct & { images: PrismaProductImage[] }): Product {
  return {
    ...product,
    description: product.description ?? undefined,
    images: [...product.images].sort((a, b) => a.displayOrder - b.displayOrder),
  };
}

export function serializeStaff(staff: PrismaStaff): Staff {
  return {
    ...staff,
    phone: staff.phone ?? undefined,
    roleDetail: staff.roleDetail ?? undefined,
  };
}

export function serializeMedia(media: PrismaMedia): Media {
  return { ...media, createdAt: media.createdAt.toISOString() };
}

export function serializeVendor(vendor: PrismaVendor): Vendor {
  return {
    id: vendor.id,
    name: vendor.name,
    slug: vendor.slug,
    description: vendor.description,
    location: vendor.location,
    hours: vendor.hours,
    phone: vendor.phone,
    whatsapp: vendor.whatsapp,
    coverColor: vendor.coverColor ?? undefined,
    logoUrl: vendor.logoUrl ?? undefined,
    coverImageUrl: vendor.coverImageUrl ?? undefined,
    personalWhatsappNumber: vendor.personalWhatsappNumber ?? undefined,
    depositSetting: vendor.depositSetting,
    depositValue: vendor.depositValue ?? undefined,
    cancellationPolicy: vendor.cancellationPolicy ?? undefined,
    storefrontPublished: vendor.storefrontPublished,
    storefrontDisplayMode: vendor.storefrontDisplayMode,
    active: vendor.active,
    createdAt: vendor.createdAt.toISOString(),
  };
}

export function serializeVendorVideo(video: PrismaVendorVideo): VendorVideo {
  return {
    ...video,
    description: video.description ?? undefined,
    durationSeconds: video.durationSeconds ?? undefined,
    thumbnailUrl: video.thumbnailUrl ?? undefined,
  };
}

export function serializePaymentMethod(pm: PrismaPaymentMethod): PaymentMethod {
  return {
    ...pm,
    accountNumber: pm.accountNumber ?? undefined,
    bankName: pm.bankName ?? undefined,
    network: pm.network ?? undefined,
  };
}
