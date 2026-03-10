"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { CampaignFormValues } from "./campaign-builder-types";
import {
  CLIENTS_KEY,
  SEED_CLIENTS,
  type SalesClient,
  loadOrSeed,
  persist,
  generateId,
  CLIENT_CATEGORIES,
} from "@/lib/sales-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Check,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

// ---------------------------------------------------------------------------
// New-client form defaults
// ---------------------------------------------------------------------------

interface NewClientForm {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  category: string;
}

const EMPTY_CLIENT_FORM: NewClientForm = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  category: CLIENT_CATEGORIES[0],
};

// ---------------------------------------------------------------------------
// StepClient — select or create an advertiser / client
// ---------------------------------------------------------------------------

export function StepClient() {
  const { watch, setValue } = useFormContext<CampaignFormValues>();
  const selectedId = watch("clientId");

  const [clients, setClients] = useState<SalesClient[]>([]);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClient, setNewClient] = useState<NewClientForm>(EMPTY_CLIENT_FORM);

  // Load clients from localStorage on mount
  useEffect(() => {
    setClients(loadOrSeed<SalesClient>(CLIENTS_KEY, SEED_CLIENTS));
  }, []);

  // ------- derived -------

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  const filteredClients = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.businessName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  // ------- handlers -------

  function selectClient(c: SalesClient) {
    setValue("clientId", c.id);
    setValue("clientName", c.businessName);
  }

  function handleSaveNewClient() {
    if (!newClient.businessName.trim()) return;

    const client: SalesClient = {
      id: generateId(),
      businessName: newClient.businessName.trim(),
      contactName: newClient.contactName.trim(),
      email: newClient.email.trim(),
      phone: newClient.phone.trim(),
      address: newClient.address.trim(),
      category: newClient.category,
    };

    const updated = [...clients, client];
    setClients(updated);
    persist(CLIENTS_KEY, updated);

    // Select the newly created client
    selectClient(client);

    // Reset form
    setNewClient(EMPTY_CLIENT_FORM);
    setShowNewForm(false);
  }

  // ------- render -------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Select Client
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose an existing advertiser or create a new one.
        </p>
      </div>

      {/* Selected client highlight */}
      {selectedClient && (
        <Card className="border-[#74ddc7] bg-[#74ddc7]/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#74ddc7]">
              <Check className="h-5 w-5" />
              Selected Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {selectedClient.businessName}
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                {selectedClient.contactName}
              </div>
              {selectedClient.email && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedClient.email}
                </div>
              )}
              {selectedClient.phone && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selectedClient.phone}
                </div>
              )}
              {selectedClient.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-full">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {selectedClient.address}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + New Client button row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowNewForm(!showNewForm)}
        >
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* New client inline form */}
      {showNewForm && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Add New Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Business Name (required) */}
              <div className="space-y-2">
                <Label htmlFor="nc-business">Business Name *</Label>
                <Input
                  id="nc-business"
                  placeholder="Acme Corp"
                  value={newClient.businessName}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      businessName: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Contact Name */}
              <div className="space-y-2">
                <Label htmlFor="nc-contact">Contact Name</Label>
                <Input
                  id="nc-contact"
                  placeholder="Jane Doe"
                  value={newClient.contactName}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      contactName: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="nc-email">Email</Label>
                <Input
                  id="nc-email"
                  type="email"
                  placeholder="jane@acme.com"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="nc-phone">Phone</Label>
                <Input
                  id="nc-phone"
                  type="tel"
                  placeholder="(910) 555-0000"
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Address */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nc-address">Address</Label>
                <Input
                  id="nc-address"
                  placeholder="123 Main St, Fayetteville, NC"
                  value={newClient.address}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="nc-category">Category</Label>
                <select
                  id="nc-category"
                  value={newClient.category}
                  onChange={(e) =>
                    setNewClient((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                >
                  {CLIENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save / Cancel buttons */}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                onClick={handleSaveNewClient}
                disabled={!newClient.businessName.trim()}
              >
                Save Client
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowNewForm(false);
                  setNewClient(EMPTY_CLIENT_FORM);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client list */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((c) => {
          const isSelected = c.id === selectedId;

          return (
            <Card
              key={c.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => selectClient(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectClient(c);
                }
              }}
              className={`cursor-pointer transition-colors ${
                isSelected
                  ? "border-[#74ddc7] bg-[#74ddc7]/10"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">
                      {c.businessName}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-[#74ddc7] shrink-0" />
                  )}
                </div>

                {c.contactName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {c.contactName}
                  </div>
                )}

                {c.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {c.email}
                  </div>
                )}

                <Badge variant="secondary" className="mt-1 w-fit text-xs">
                  {c.category}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No clients found. Try a different search or add a new client.
        </div>
      )}
    </div>
  );
}
