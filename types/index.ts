export type ServiceCategory = "Hair" | "Nails" | "Skin" | "Lashes" | "Brows" | "Other";

export type StaffRole = "Owner" | "Management" | "Service";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rescheduled";

export type OrderStatus = "new" | "processing" | "ready" | "completed" | "cancelled";

export type PaymentMethodType = "momo" | "bank" | "cash";

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  hours: string;
  phone: string;
  whatsapp: string;
  coverColor?: string;
  active: boolean;
  createdAt: string;
}

export interface Staff {
  id: string;
  vendorId: string;
  name: string;
  phone: string;
  role: StaffRole;
  roleDetail?: string;
  botAccess: boolean;
  active: boolean;
  serviceCategories: ServiceCategory[];
}

export interface Service {
  id: string;
  vendorId: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  priceInPesewas: number;
  description?: string;
  active: boolean;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  priceInPesewas: number;
  stockCount: number;
  lowStockThreshold: number;
  description?: string;
  imageUrl?: string;
  active: boolean;
}

export interface BookingService {
  serviceId: string;
  name: string;
  priceAtBooking: number;
  durationMinutes: number;
}

export interface BookingProduct {
  productId: string;
  name: string;
  priceAtBooking: number;
  quantity: number;
}

export interface Booking {
  id: string;
  slug: string;
  vendorId: string;
  customerName: string;
  customerPhone: string;
  services: BookingService[];
  products: BookingProduct[];
  staffId: string | null;
  staffName: string | null;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string;
  depositAmountPesewas: number;
  seenByVendorAt: string | null;
  createdAt: string;
  pdfUrl?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  priceSnapshot: number;
  quantity: number;
}

export interface Order {
  id: string;
  slug: string;
  ref: string;
  vendorId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalPesewas: number;
  status: OrderStatus;
  seenByVendorAt: string | null;
  createdAt: string;
  pdfUrl?: string;
}

export interface PaymentMethod {
  id: string;
  vendorId: string;
  type: PaymentMethodType;
  label: string;
  accountName: string;
  accountNumber?: string;
  bankName?: string;
  network?: string;
  active: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}
