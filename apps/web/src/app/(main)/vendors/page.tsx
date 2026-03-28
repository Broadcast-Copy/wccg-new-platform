"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Store,
  Clock,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  CheckCircle2,
  Ticket,
  ShoppingBag,
  CalendarCheck,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VendorProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

interface BookingSlot {
  id: string;
  service_name: string;
  type: string;
  duration_minutes: number;
  capacity: number;
  price: number;
  description: string;
  status: string;
}

interface VendorProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  inventory: number;
}

interface VendorEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  capacity: number;
  tickets_sold: number;
  price: number;
  ticket_type: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Inner client (reads searchParams)
// ---------------------------------------------------------------------------
function VendorStorefrontInner() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("id");
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<"services" | "products" | "events">("services");

  const fetchVendorData = useCallback(async () => {
    if (!vendorId) { setLoading(false); return; }
    setLoading(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url")
      .eq("id", vendorId)
      .single();
    if (profile) setVendor(profile);

    const { data: slots } = await supabase
      .from("vendor_bookings")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (slots) setBookings(slots);

    const { data: prods } = await supabase
      .from("vendor_products")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (prods) setProducts(prods);

    const { data: evts } = await supabase
      .from("vendor_events")
      .select("*")
      .eq("vendor_id", vendorId)
      .eq("status", "upcoming")
      .order("date", { ascending: true });
    if (evts) setEvents(evts);

    setLoading(false);
  }, [vendorId, supabase]);

  useEffect(() => { fetchVendorData(); }, [fetchVendorData]);

  async function handleBooking() {
    if (!user) { toast.error("Please sign in to book a service"); return; }
    if (!selectedSlot || !bookingDate) { toast.error("Please select a date"); return; }

    setBookingSubmitting(true);
    const { error } = await supabase.from("booking_reservations").insert({
      booking_id: selectedSlot.id,
      customer_id: user.id,
      date: bookingDate,
      time_slot: bookingTime || null,
      status: "pending",
    });

    if (error) {
      console.error("Booking error:", error);
      toast.error("Failed to create booking. Please try again.");
    } else {
      setBookingSuccess(true);
      toast.success("Booking request submitted!");
      setTimeout(() => {
        setSelectedSlot(null);
        setBookingDate("");
        setBookingTime("");
        setBookingSuccess(false);
      }, 3000);
    }
    setBookingSubmitting(false);
  }

  if (!vendorId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Store className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">No vendor selected</p>
        <Link href="/my/directory" className="text-primary underline">Browse Directory</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Store className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Vendor not found</p>
        <Link href="/my/directory" className="text-primary underline">Browse Directory</Link>
      </div>
    );
  }

  const initials = (vendor.display_name || "V").slice(0, 2).toUpperCase();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link href="/my/directory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Link>

      {/* Vendor Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{vendor.display_name}</h1>
          <p className="text-muted-foreground">{vendor.email}</p>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {products.length} Products</span>
            <span className="flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" /> {bookings.length} Services</span>
            <span className="flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> {events.length} Events</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["services", "products", "events"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No services available right now.</p>
          ) : bookings.map((slot) => (
            <div key={slot.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{slot.service_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{slot.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {slot.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {slot.capacity} spots</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> ${Number(slot.price).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    selectedSlot?.id === slot.id
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {selectedSlot?.id === slot.id ? "Cancel" : "Book Now"}
                </button>
              </div>

              {selectedSlot?.id === slot.id && (
                <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                  {bookingSuccess ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Booking submitted! The vendor will confirm shortly.</span>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-medium mb-3">Book: {slot.service_name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date *</label>
                          <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Preferred Time</label>
                          <input
                            type="time"
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      {!user && (
                        <p className="mt-3 text-sm text-amber-600">
                          <Link href="/login" className="underline font-medium">Sign in</Link> to complete your booking.
                        </p>
                      )}
                      <button
                        onClick={handleBooking}
                        disabled={bookingSubmitting || !bookingDate || !user}
                        className="mt-3 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bookingSubmitting ? "Submitting..." : `Confirm Booking \u2014 $${Number(slot.price).toFixed(2)}`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.length === 0 ? (
            <p className="col-span-2 text-center py-12 text-muted-foreground">No products available.</p>
          ) : products.map((product) => (
            <div key={product.id} className="rounded-lg border bg-card overflow-hidden">
              <div className="h-40 bg-muted flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{product.name}</h3>
                  <span className="text-primary font-bold">${Number(product.price).toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{product.category}</span>
                  <span className="text-xs text-muted-foreground">{product.inventory} in stock</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No upcoming events.</p>
          ) : events.map((event) => (
            <div key={event.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.venue}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {event.tickets_sold}/{event.capacity}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {event.ticket_type === "free" ? "Free" : `$${Number(event.price).toFixed(2)}`}
                  </span>
                  <span className="block text-xs text-muted-foreground capitalize">{event.ticket_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper with Suspense (needed for useSearchParams)
// ---------------------------------------------------------------------------
export default function VendorStorefrontPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <VendorStorefrontInner />
    </Suspense>
  );
}
