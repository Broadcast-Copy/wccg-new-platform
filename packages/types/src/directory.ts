export type ListingStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE';

export type ListingCategory =
  | 'Restaurants'
  | 'Auto Services'
  | 'Beauty & Barber'
  | 'Health & Wellness'
  | 'Legal Services'
  | 'Real Estate'
  | 'Education'
  | 'Churches'
  | 'Entertainment'
  | 'Home Services'
  | 'Government & Services';

export interface DirectoryListing {
  id: string;
  ownerId: string | null;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  featured: boolean;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingDto {
  name: string;
  category: string;
  description?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
}

export interface UpdateListingDto extends Partial<CreateListingDto> {
  featured?: boolean;
  status?: ListingStatus;
}
