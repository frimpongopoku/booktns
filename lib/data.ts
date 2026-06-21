import type {
  Vendor,
  Staff,
  Service,
  Product,
  Booking,
  Order,
  PaymentMethod,
} from "@/types";

export const vendor: Vendor = {
  id: "v1",
  name: "Glam by Rose",
  slug: "glambyrose",
  description: "Premium hair, skin, and nail services tailored for you.",
  location: "Lekki Phase 1, Lagos",
  hours: "Mon–Sat 9am–7pm",
  phone: "+2348012345678",
  whatsapp: "+2348012345678",
  active: true,
  createdAt: "2024-01-15T09:00:00Z",
};

export const staff: Staff[] = [
  {
    id: "s1",
    vendorId: "v1",
    name: "Rose Adeyemi",
    phone: "+2348012345678",
    role: "Owner",
    botAccess: true,
    active: true,
    serviceCategories: ["Hair", "Nails", "Skin", "Lashes"],
  },
  {
    id: "s2",
    vendorId: "v1",
    name: "Fatima Bello",
    phone: "+2348023456789",
    role: "Management",
    botAccess: true,
    active: true,
    serviceCategories: ["Skin"],
  },
  {
    id: "s3",
    vendorId: "v1",
    name: "Chioma Okafor",
    phone: "+2348034567890",
    role: "Service",
    roleDetail: "Hair",
    botAccess: true,
    active: true,
    serviceCategories: ["Hair"],
  },
  {
    id: "s4",
    vendorId: "v1",
    name: "Kemi Adebayo",
    phone: "+2348045678901",
    role: "Service",
    roleDetail: "Nails",
    botAccess: false,
    active: true,
    serviceCategories: ["Nails"],
  },
];

export const services: Service[] = [
  {
    id: "svc1",
    vendorId: "v1",
    name: "Knotless Braids",
    category: "Hair",
    durationMinutes: 270,
    priceInPesewas: 35000,
    description: "Long-lasting protective knotless braids in any size.",
    active: true,
  },
  {
    id: "svc2",
    vendorId: "v1",
    name: "Gel Manicure",
    category: "Nails",
    durationMinutes: 90,
    priceInPesewas: 12000,
    description: "Long-lasting gel polish with nail shaping and cuticle care.",
    active: true,
  },
  {
    id: "svc3",
    vendorId: "v1",
    name: "Facial Treatment",
    category: "Skin",
    durationMinutes: 60,
    priceInPesewas: 20000,
    description: "Deep cleansing facial with extraction and hydration mask.",
    active: true,
  },
  {
    id: "svc4",
    vendorId: "v1",
    name: "Lash Extensions",
    category: "Lashes",
    durationMinutes: 60,
    priceInPesewas: 15000,
    description: "Classic or volume lash extensions for a full, natural look.",
    active: true,
  },
  {
    id: "svc5",
    vendorId: "v1",
    name: "Pedicure",
    category: "Nails",
    durationMinutes: 60,
    priceInPesewas: 10000,
    description: "Relaxing foot soak, exfoliation, and nail polish.",
    active: true,
  },
  {
    id: "svc6",
    vendorId: "v1",
    name: "Twist Out",
    category: "Hair",
    durationMinutes: 120,
    priceInPesewas: 18000,
    description: "Defined twist out for natural hair.",
    active: true,
  },
];

export const products: Product[] = [
  {
    id: "p1",
    vendorId: "v1",
    name: "Argan Hair Oil",
    priceInPesewas: 8500,
    stockCount: 23,
    lowStockThreshold: 5,
    description: "Pure Moroccan argan oil for shine and moisture.",
    active: true,
  },
  {
    id: "p2",
    vendorId: "v1",
    name: "Curl Defining Cream",
    priceInPesewas: 6500,
    stockCount: 15,
    lowStockThreshold: 5,
    description: "Lightweight cream for defined, frizz-free curls.",
    active: true,
  },
  {
    id: "p3",
    vendorId: "v1",
    name: "Vitamin C Serum",
    priceInPesewas: 11000,
    stockCount: 8,
    lowStockThreshold: 5,
    description: "Brightening serum with 15% Vitamin C complex.",
    active: true,
  },
  {
    id: "p4",
    vendorId: "v1",
    name: "Nail Kit – Nude Set",
    priceInPesewas: 4500,
    stockCount: 30,
    lowStockThreshold: 5,
    description: "Complete at-home nail kit in elegant nude shades.",
    active: true,
  },
  {
    id: "p5",
    vendorId: "v1",
    name: "Shea Butter Moisturiser",
    priceInPesewas: 5500,
    stockCount: 5,
    lowStockThreshold: 6,
    description: "Rich whipped shea butter for deep skin hydration.",
    active: true,
  },
  {
    id: "p6",
    vendorId: "v1",
    name: "Rose Water Toner",
    priceInPesewas: 7000,
    stockCount: 12,
    lowStockThreshold: 5,
    description: "Balancing rose water toner for all skin types.",
    active: true,
  },
];

export const bookings: Booking[] = [
  {
    id: "b1",
    slug: "bkt-00231",
    vendorId: "v1",
    customerName: "Amara Johnson",
    customerPhone: "+2348055000001",
    services: [
      {
        serviceId: "svc1",
        name: "Knotless Braids",
        priceAtBooking: 35000,
        durationMinutes: 270,
      },
      {
        serviceId: "svc2",
        name: "Gel Manicure",
        priceAtBooking: 12000,
        durationMinutes: 90,
      },
    ],
    products: [],
    staffId: "s3",
    staffName: "Chioma Okafor",
    startTime: "2025-07-16T10:30:00+01:00",
    endTime: "2025-07-16T17:00:00+01:00",
    status: "confirmed",
    notes: "Prefers medium-sized braids",
    depositAmountPesewas: 10000,
    seenByVendorAt: "2025-07-15T08:00:00Z",
    createdAt: "2025-07-14T14:32:00Z",
  },
  {
    id: "b2",
    slug: "bkt-00232",
    vendorId: "v1",
    customerName: "Zara Mohammed",
    customerPhone: "+2348055000002",
    services: [
      {
        serviceId: "svc3",
        name: "Facial Treatment",
        priceAtBooking: 20000,
        durationMinutes: 60,
      },
    ],
    products: [],
    staffId: "s2",
    staffName: "Fatima Bello",
    startTime: "2025-07-16T14:00:00+01:00",
    endTime: "2025-07-16T15:00:00+01:00",
    status: "pending",
    notes: "",
    depositAmountPesewas: 0,
    seenByVendorAt: null,
    createdAt: "2025-07-15T09:10:00Z",
  },
  {
    id: "b3",
    slug: "bkt-00233",
    vendorId: "v1",
    customerName: "Blessing Eze",
    customerPhone: "+2348055000003",
    services: [
      {
        serviceId: "svc4",
        name: "Lash Extensions",
        priceAtBooking: 15000,
        durationMinutes: 60,
      },
    ],
    products: [],
    staffId: "s1",
    staffName: "Rose Adeyemi",
    startTime: "2025-07-17T11:00:00+01:00",
    endTime: "2025-07-17T12:00:00+01:00",
    status: "confirmed",
    notes: "First time client",
    depositAmountPesewas: 5000,
    seenByVendorAt: "2025-07-15T11:00:00Z",
    createdAt: "2025-07-15T10:45:00Z",
  },
  {
    id: "b4",
    slug: "bkt-00234",
    vendorId: "v1",
    customerName: "Ngozi Obi",
    customerPhone: "+2348055000004",
    services: [
      {
        serviceId: "svc5",
        name: "Pedicure",
        priceAtBooking: 10000,
        durationMinutes: 60,
      },
    ],
    products: [],
    staffId: "s4",
    staffName: "Kemi Adebayo",
    startTime: "2025-07-18T15:00:00+01:00",
    endTime: "2025-07-18T16:00:00+01:00",
    status: "pending",
    notes: "",
    depositAmountPesewas: 0,
    seenByVendorAt: null,
    createdAt: "2025-07-15T16:20:00Z",
  },
];

export const orders: Order[] = [
  {
    id: "o1",
    slug: "ord-00891",
    ref: "ORD-00891",
    vendorId: "v1",
    customerName: "Tolu Adesanya",
    customerPhone: "+2348055000005",
    items: [
      {
        productId: "p1",
        name: "Argan Hair Oil",
        priceSnapshot: 8500,
        quantity: 2,
      },
      {
        productId: "p2",
        name: "Curl Defining Cream",
        priceSnapshot: 6500,
        quantity: 1,
      },
    ],
    totalPesewas: 23500,
    status: "new",
    seenByVendorAt: null,
    createdAt: "2025-07-15T13:00:00Z",
  },
  {
    id: "o2",
    slug: "ord-00892",
    ref: "ORD-00892",
    vendorId: "v1",
    customerName: "Sade Ibrahim",
    customerPhone: "+2348055000006",
    items: [
      {
        productId: "p3",
        name: "Vitamin C Serum",
        priceSnapshot: 11000,
        quantity: 1,
      },
    ],
    totalPesewas: 11000,
    status: "processing",
    seenByVendorAt: "2025-07-15T14:00:00Z",
    createdAt: "2025-07-15T12:00:00Z",
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: "pm1",
    vendorId: "v1",
    type: "momo",
    label: "MTN MoMo",
    accountName: "Rose Adeyemi",
    accountNumber: "0551234567",
    network: "MTN",
    active: true,
  },
  {
    id: "pm2",
    vendorId: "v1",
    type: "bank",
    label: "GTBank",
    accountName: "Rose Adeyemi",
    accountNumber: "0123456789",
    bankName: "GTBank PLC",
    active: true,
  },
  {
    id: "pm3",
    vendorId: "v1",
    type: "cash",
    label: "Cash on Arrival",
    accountName: "Rose Adeyemi",
    active: true,
  },
];

// Helper formatters
export function formatPrice(pesewas: number): string {
  const amount = pesewas / 100;
  return `GH₵ ${amount.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}hr`;
  return `${h}.${Math.round((m / 60) * 10)}hrs`;
}

export function getVendorBySlug(slug: string): Vendor | undefined {
  if (slug === vendor.slug) return vendor;
  return undefined;
}
