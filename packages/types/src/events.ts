export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN';
export type OrganizerRole = 'OWNER' | 'COHOST' | 'STAFF';

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string;
  end_date: string;
  timezone: string;
  category: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  max_attendees: number | null;
  is_free: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  description: string | null;
  sales_start: string | null;
  sales_end: string | null;
  is_active: boolean;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type_id: string;
  status: RegistrationStatus;
  qr_code: string | null;
  purchased_at: string;
  checked_in_at: string | null;
}

export interface EventWithTickets extends Event {
  ticket_types: TicketType[];
  registration_count: number;
}
