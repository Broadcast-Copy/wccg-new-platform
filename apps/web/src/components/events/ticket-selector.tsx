"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface TicketType {
  id: string;
  name: string;
  price: string;
  quantity: string;
}

export function TicketSelector() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { id: "1", name: "General Admission", price: "0", quantity: "100" },
  ]);

  const addTicketType = () => {
    setTicketTypes((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "",
        price: "0",
        quantity: "50",
      },
    ]);
  };

  const removeTicketType = (id: string) => {
    setTicketTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTicketType = (
    id: string,
    field: keyof TicketType,
    value: string,
  ) => {
    setTicketTypes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Ticket Types</h3>
      {ticketTypes.map((ticket) => (
        <div key={ticket.id} className="flex items-end gap-3 rounded-lg border p-4">
          <div className="flex-1 space-y-2">
            <Label>Name</Label>
            <Input
              value={ticket.name}
              onChange={(e) =>
                updateTicketType(ticket.id, "name", e.target.value)
              }
              placeholder="Ticket type name"
            />
          </div>
          <div className="w-28 space-y-2">
            <Label>Price ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={ticket.price}
              onChange={(e) =>
                updateTicketType(ticket.id, "price", e.target.value)
              }
            />
          </div>
          <div className="w-24 space-y-2">
            <Label>Qty</Label>
            <Input
              type="number"
              min="1"
              value={ticket.quantity}
              onChange={(e) =>
                updateTicketType(ticket.id, "quantity", e.target.value)
              }
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeTicketType(ticket.id)}
            disabled={ticketTypes.length <= 1}
            aria-label="Remove ticket type"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addTicketType}>
        <Plus className="mr-2 h-4 w-4" />
        Add Ticket Type
      </Button>
    </div>
  );
}
