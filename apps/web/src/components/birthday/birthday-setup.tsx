"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { loadBirthday, saveBirthday, formatBirthday } from "@/lib/birthday";
import type { BirthdayData } from "@/lib/birthday";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface BirthdaySetupProps {
  email: string;
  onSaved?: () => void;
}

export function BirthdaySetup({ email, onSaved }: BirthdaySetupProps) {
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [shoutoutRequested, setShoutoutRequested] = useState(false);
  const [shoutoutName, setShoutoutName] = useState("");
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState<BirthdayData | null>(null);

  useEffect(() => {
    const data = loadBirthday(email);
    if (data) {
      setMonth(data.month);
      setDay(data.day);
      setShoutoutRequested(data.shoutoutRequested);
      setShoutoutName(data.shoutoutName);
      setExisting(data);
    }
  }, [email]);

  // Get max days for the selected month
  const maxDays = new Date(2024, month, 0).getDate(); // 2024 is a leap year for Feb

  function handleSave() {
    const adjustedDay = Math.min(day, maxDays);
    const data: BirthdayData = {
      month,
      day: adjustedDay,
      shoutoutRequested,
      shoutoutName: shoutoutRequested ? shoutoutName : "",
      lastAwardedYear: existing?.lastAwardedYear ?? 0,
    };
    saveBirthday(email, data);
    setExisting(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved?.();
  }

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-lg text-white">
          {existing ? "Edit Your Birthday" : "Set Your Birthday"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {existing && (
          <div className="rounded-lg bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-4 py-3">
            <p className="text-sm text-[#74ddc7]">
              Your birthday: <span className="font-semibold">{formatBirthday(existing.month, existing.day)}</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            >
              {MONTHS.map((name, i) => (
                <option key={i} value={i + 1} className="bg-[#0a0a0f] text-white">
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Day
            </label>
            <select
              value={Math.min(day, maxDays)}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            >
              {Array.from({ length: maxDays }, (_, i) => (
                <option key={i} value={i + 1} className="bg-[#0a0a0f] text-white">
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Request on-air shoutout</p>
            <p className="text-xs text-white/50">Get a birthday shoutout on WCCG 104.5 FM</p>
          </div>
          <Switch
            checked={shoutoutRequested}
            onCheckedChange={setShoutoutRequested}
          />
        </div>

        {shoutoutRequested && (
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Name for shoutout
            </label>
            <input
              type="text"
              value={shoutoutName}
              onChange={(e) => setShoutoutName(e.target.value)}
              placeholder="How should we say your name on-air?"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            />
          </div>
        )}

        <Button
          onClick={handleSave}
          className="w-full bg-[#7401df] hover:bg-[#7401df]/80 text-white"
        >
          {saved ? "Saved!" : existing ? "Update Birthday" : "Save Birthday"}
        </Button>
      </CardContent>
    </Card>
  );
}
