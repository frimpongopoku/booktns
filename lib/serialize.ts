import type {
  Service as PrismaService,
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  Staff as PrismaStaff,
  Media as PrismaMedia,
} from "@/lib/generated/prisma/client";
import type { Service, Product, Staff, Media } from "@/types";

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
