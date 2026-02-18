export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN';
export type OrganizerRole = 'OWNER' | 'COHOST' | 'STAFF';

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  timezone: string;
  category: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  maxAttendees: number | null;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  quantitySold: number;
  description: string | null;
  salesStart: string | null;
  salesEnd: string | null;
  isActive: boolean;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  ticketTypeId: string;
  status: RegistrationStatus;
  qrCode: string;
  purchasedAt: string;
  checkedInAt: string | null;
}

export interface EventWithTickets extends Event {
  ticketTypes: TicketType[];
  registrationCount: number;
}
