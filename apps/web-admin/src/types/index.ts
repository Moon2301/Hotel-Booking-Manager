// === Auth & User ===

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  FRONT_DESK = 'FRONT_DESK',
  HOUSEKEEPING = 'HOUSEKEEPING',
  FINANCE_READ = 'FINANCE_READ',
  SUPPORT = 'SUPPORT',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

// === Property ===

export interface Property {
  id: string;
  name: string;
  ianaTimezone: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  holdTtlSeconds: number;
  createdAt: string;
  updatedAt: string;
}

// === Room Type ===

export interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  basePrice: number;
  maxOccupancy: number;
  amenities: string[];
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// === Room ===

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
}

export interface Room {
  id: string;
  propertyId: string;
  roomTypeId: string;
  roomNumber: string;
  status: RoomStatus;
  floor: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (populated)
  roomType?: RoomType;
}

// === Booking ===

export enum BookingStatus {
  HOLD = 'HOLD',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORISED = 'AUTHORISED',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export interface Booking {
  id: string;
  propertyId: string;
  roomId: string | null;
  roomTypeId: string;
  guestId: string;
  status: BookingStatus;
  checkIn: string; // date string YYYY-MM-DD
  checkOut: string; // date string YYYY-MM-DD
  policySnapshot: Record<string, unknown> | null;
  paymentStatus: PaymentStatus;
  totalAmount: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  guest?: User;
  room?: Room;
  roomType?: RoomType;
  property?: Property;
}

// === Pricing ===

export enum RateSource {
  MANUAL = 'MANUAL',
  RULE = 'RULE',
  IMPORT = 'IMPORT',
}

export interface DailyRate {
  id: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string | null;
  night: string; // date string YYYY-MM-DD
  amount: number;
  currency: string;
  taxIncluded: boolean;
  minStay: number;
  closedToArrival: boolean;
  rateSource: RateSource;
  createdAt: string;
  updatedAt: string;
}

export interface RatePlan {
  id: string;
  propertyId: string;
  code: string;
  name: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// === Payment ===

export enum PaymentOutcome {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  eventId: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  booking?: Booking;
}

export interface PaymentEvent {
  id: string;
  eventId: string;
  provider: string;
  payloadHash: string;
  outcome: PaymentOutcome;
  processedAt: string;
}

// === Review ===

export enum ReviewStatus {
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
  FLAGGED = 'FLAGGED',
}

export interface Review {
  id: string;
  bookingId: string;
  guestId: string;
  propertyId: string;
  rating: number;
  content: string | null;
  status: ReviewStatus;
  flaggedReason: string | null;
  hiddenReason: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  guest?: User;
  property?: Property;
}

// === Chat ===

export enum ChatThreadStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface ChatThread {
  id: string;
  propertyId: string;
  bookingId: string | null;
  guestId: string;
  status: ChatThreadStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  guest?: User;
  property?: Property;
  // Computed
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  content: string;
  sentAt: string;
  // Relations
  sender?: User;
}

// === Cancellation Policy ===

export interface CancellationPolicy {
  id: string;
  propertyId: string;
  freeCancelUntilHoursBeforeCheckin: number;
  feeRuleRef: Record<string, unknown> | null;
  noShowRule: Record<string, unknown> | null;
  policyVersion: number;
  isActive: boolean;
  createdAt: string;
}

// === Audit Log ===

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

// === Pagination ===

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// === API Error ===

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
