import { TicketsList } from "./tickets-list";

export const metadata = {
  title: "My Tickets | WCCG 104.5 FM",
};

export default function MyTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
        <p className="text-muted-foreground">
          Your event tickets and reservations
        </p>
      </div>
      <TicketsList />
    </div>
  );
}
