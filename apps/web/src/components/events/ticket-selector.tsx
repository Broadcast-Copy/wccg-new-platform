"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
}

interface TicketSelectorProps {
  tickets: TicketType[];
  onChange: (tickets: TicketType[]) => void;
  isFree: boolean;
}

export function TicketSelector({ tickets, onChange, isFree }: TicketSelectorProps) {
  const addTicketType = () => {
    onChange([
      ...tickets,
      {
        id: String(Date.now()),
        name: "",
        price: 0,
        quantity: 50,
        description: "",
      },
    ]);
  };

  const removeTicketType = (id: string) => {
    onChange(tickets.filter((t) => t.id !== id));
  };

  const updateTicketType = (
    id: string,
    field: keyof TicketType,
    value: string | number,
  ) => {
    onChange(
      tickets.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ticket Types</h3>
        {isFree && (
          <span className="text-sm text-muted-foreground">
            Free event — pricing disabled
          </span>
        )}
      </div>

      {tickets.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No ticket types added. Click below to add one.
        </p>
      )}

      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Name</Label>
              <Input
                value={ticket.name}
                onChange={(e) =>
                  updateTicketType(ticket.id, "name", e.target.value)
                }
                placeholder="e.g. General Admission, VIP"
              />
            </div>
            <div className="w-28 space-y-2">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={isFree ? 0 : ticket.price}
                onChange={(e) =>
                  updateTicketType(
                    ticket.id,
                    "price",
                    parseFloat(e.target.value) || 0,
                  )
                }
                disabled={isFree}
              />
            </div>
            <div className="w-24 space-y-2">
              <Label>Qty</Label>
              <Input
                type="number"
                min="1"
                value={ticket.quantity}
                onChange={(e) =>
                  updateTicketType(
                    ticket.id,
                    "quantity",
                    parseInt(e.target.value, 10) || 1,
                  )
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeTicketType(ticket.id)}
              disabled={tickets.length <= 1}
              aria-label="Remove ticket type"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={ticket.description}
              onChange={(e) =>
                updateTicketType(ticket.id, "description", e.target.value)
              }
              placeholder="Brief description of what this ticket includes"
            />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addTicketType}>
        <Plus className="mr-2 h-4 w-4" />
        Add Ticket Type
      </Button>
    </div>
  );
}
