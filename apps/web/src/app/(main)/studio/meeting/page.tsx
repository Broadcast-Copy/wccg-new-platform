"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Circle,
  MessageSquare,
  Users,
  SmilePlus,
  Phone,
  Pin,
  PinOff,
  MoreVertical,
  Send,
  Copy,
  Calendar,
  Clock,
  Link2,
  QrCode,
  Mail,
  Repeat,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
  Settings,
  Pencil,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Participant {
  id: string;
  name: string;
  role: "host" | "guest";
  muted: boolean;
  camera: boolean;
  initials: string;
  gradient: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface ScheduledMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  recurring: boolean;
  link: string;
}

/* ------------------------------------------------------------------ */
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: "you",
    name: "You",
    role: "host",
    muted: false,
    camera: true,
    initials: "YO",
    gradient: "from-[#7401df] to-[#4c1d95]",
  },
  {
    id: "mike",
    name: "DJ Mike G",
    role: "guest",
    muted: true,
    camera: true,
    initials: "MG",
    gradient: "from-[#f59e0b] to-[#d97706]",
  },
  {
    id: "angela",
    name: "Angela Yee",
    role: "guest",
    muted: false,
    camera: false,
    initials: "AY",
    gradient: "from-[#ec4899] to-[#be185d]",
  },
];

const REACTIONS = ["👍", "👏", "🎉", "❤️", "😂"];

/* ------------------------------------------------------------------ */
/*  Helper: format seconds as HH:MM:SS                                 */
/* ------------------------------------------------------------------ */

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MeetingRoomPage() {
  const { user } = useAuth();

  // -- Meeting state --
  const [meetingTitle, setMeetingTitle] = useState("WCCG Studio Session");
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Participants --
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // -- Local controls --
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // -- Side panel --
  const [sidePanel, setSidePanel] = useState<"chat" | "participants" | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "1", sender: "DJ Mike G", text: "Hey team, ready when you are!", time: "10:01 AM" },
    { id: "2", sender: "Angela Yee", text: "Let me adjust my audio real quick", time: "10:02 AM" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // -- Reactions --
  const [showReactions, setShowReactions] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  // -- Schedule modal --
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    date: "",
    time: "",
    duration: "60",
    recurring: false,
    email: "",
  });
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([
    {
      id: "m1",
      title: "Morning Show Prep",
      date: "2026-03-31",
      time: "08:00",
      duration: "30",
      recurring: true,
      link: "https://wccg1045fm.com/meet/morning-prep",
    },
    {
      id: "m2",
      title: "Guest Interview - Mayor",
      date: "2026-04-02",
      time: "14:00",
      duration: "60",
      recurring: false,
      link: "https://wccg1045fm.com/meet/mayor-interview",
    },
  ]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // -- Timer --
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // -- Auto-scroll chat --
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // -- Title edit focus --
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  // -- Reaction timeout --
  useEffect(() => {
    if (activeReaction) {
      const t = setTimeout(() => setActiveReaction(null), 2000);
      return () => clearTimeout(t);
    }
  }, [activeReaction]);

  // ---- Handlers ----

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "You",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  }, [chatInput]);

  const toggleParticipantMute = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, muted: !p.muted } : p))
    );
  };

  const removeParticipant = (id: string) => {
    if (id === "you") return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    if (pinnedId === id) setPinnedId(null);
  };

  const scheduleMeeting = () => {
    if (!scheduleForm.title || !scheduleForm.date || !scheduleForm.time) return;
    const slug = scheduleForm.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const link = `https://wccg1045fm.com/meet/${slug}-${Date.now().toString(36)}`;
    const newMeeting: ScheduledMeeting = {
      id: Date.now().toString(),
      title: scheduleForm.title,
      date: scheduleForm.date,
      time: scheduleForm.time,
      duration: scheduleForm.duration,
      recurring: scheduleForm.recurring,
      link,
    };
    setScheduledMeetings((prev) => [...prev, newMeeting]);
    setGeneratedLink(link);
    setScheduleForm({ title: "", date: "", time: "", duration: "60", recurring: false, email: "" });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const deleteMeeting = (id: string) => {
    setScheduledMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  // ---- Video grid layout ----

  const displayParticipants = pinnedId
    ? [
        participants.find((p) => p.id === pinnedId)!,
        ...participants.filter((p) => p.id !== pinnedId),
      ].filter(Boolean)
    : participants;

  const gridCols = (() => {
    const count = displayParticipants.length;
    if (pinnedId) return "grid-cols-1 lg:grid-cols-[2fr_1fr]";
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    return "grid-cols-3";
  })();

  // ================================================================
  //  RENDER
  // ================================================================

  return (
    <div className="flex flex-col bg-[#0a0a0f] text-white overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 -mb-6" style={{ height: "calc(100vh - 120px)" }}>
      {/* ---- TOP BAR ---- */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/studio" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingTitle(false);
                }}
                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#74ddc7]"
              />
              <button onClick={() => setEditingTitle(false)} className="text-[#74ddc7]">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-2 text-sm font-semibold hover:text-[#74ddc7] transition-colors"
            >
              {meetingTitle}
              <Pencil className="h-3 w-3 opacity-50" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Recording indicator */}
          {isRecording && (
            <span className="flex items-center gap-1.5 text-red-400 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              REC
            </span>
          )}

          {/* Duration timer */}
          <span className="font-mono text-white/60">{formatDuration(elapsed)}</span>

          {/* Participant count */}
          <span className="flex items-center gap-1 text-white/60">
            <Users className="h-3.5 w-3.5" />
            {participants.length}
          </span>

          {/* Schedule button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSchedule(!showSchedule)}
            className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ---- MAIN AREA ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-3 overflow-hidden">
          <div
            className={`grid ${gridCols} gap-2 h-full auto-rows-fr`}
          >
            {displayParticipants.map((p, idx) => {
              const isPinned = pinnedId === p.id;
              const isYou = p.id === "you";
              const showCamera = isYou ? camOn : p.camera;

              return (
                <div
                  key={p.id}
                  className={`relative rounded-xl overflow-hidden border border-white/10 group ${
                    isPinned && pinnedId ? "row-span-2 lg:row-span-3" : ""
                  }`}
                >
                  {/* Video / placeholder */}
                  {showCamera ? (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-30`}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[#15151f] flex items-center justify-center">
                    {showCamera ? (
                      <div className="relative w-full h-full">
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-20`}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className={`h-20 w-20 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
                          >
                            {p.initials}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className={`h-20 w-20 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center text-2xl font-bold text-white`}
                        >
                          {p.initials}
                        </div>
                        {isYou && (
                          <span className="text-xs text-white/40">Camera Off</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Name label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      {p.name}
                      {p.role === "host" && (
                        <span className="text-[10px] bg-[#74ddc7]/20 text-[#74ddc7] px-1.5 py-0.5 rounded-full">
                          Host
                        </span>
                      )}
                    </span>
                    {(isYou ? !micOn : p.muted) && (
                      <MicOff className="h-3.5 w-3.5 text-red-400" />
                    )}
                  </div>

                  {/* Pin button */}
                  <button
                    onClick={() => setPinnedId(isPinned ? null : p.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Floating reaction */}
          {activeReaction && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-6xl animate-bounce pointer-events-none">
              {activeReaction}
            </div>
          )}
        </div>

        {/* ---- SIDE PANEL ---- */}
        {sidePanel && (
          <div className="w-80 border-l border-white/10 bg-[#0f0f18] flex flex-col shrink-0">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold capitalize">{sidePanel}</span>
              <button onClick={() => setSidePanel(null)} className="text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {sidePanel === "chat" ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={msg.sender === "You" ? "text-right" : ""}>
                      <div
                        className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          msg.sender === "You"
                            ? "bg-[#7401df]/30 text-white"
                            : "bg-white/5 text-white/80"
                        }`}
                      >
                        {msg.sender !== "You" && (
                          <p className="text-[10px] text-[#74ddc7] font-medium mb-0.5">
                            {msg.sender}
                          </p>
                        )}
                        <p>{msg.text}</p>
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">{msg.time}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {/* Input */}
                <div className="p-3 border-t border-white/10">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#74ddc7]"
                    />
                    <button
                      onClick={sendChat}
                      className="p-2 rounded-lg bg-[#7401df] hover:bg-[#7401df]/80 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Participants list */
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center text-xs font-bold shrink-0`}
                    >
                      {p.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.name}
                        {p.role === "host" && (
                          <span className="ml-1.5 text-[10px] text-[#74ddc7]">(Host)</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleParticipantMute(p.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          p.muted ? "text-red-400 hover:bg-red-400/10" : "text-white/40 hover:bg-white/10"
                        }`}
                      >
                        {p.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      </button>
                      {p.id !== "you" && (
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- BOTTOM CONTROL BAR ---- */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-white/10 bg-[#0a0a0f]/90 backdrop-blur-sm shrink-0">
        {/* Mic */}
        <button
          onClick={() => setMicOn(!micOn)}
          className={`relative p-3 rounded-xl transition-all ${
            micOn
              ? "bg-white/10 hover:bg-white/15 text-white"
              : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
          }`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={() => setCamOn(!camOn)}
          className={`p-3 rounded-xl transition-all ${
            camOn
              ? "bg-white/10 hover:bg-white/15 text-white"
              : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
          }`}
          title={camOn ? "Turn Off Camera" : "Turn On Camera"}
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={() => setScreenSharing(!screenSharing)}
          className={`p-3 rounded-xl transition-all ${
            screenSharing
              ? "bg-[#74ddc7]/20 text-[#74ddc7]"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
          title="Share Screen"
        >
          <MonitorUp className="h-5 w-5" />
        </button>

        {/* Record */}
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`p-3 rounded-xl transition-all ${
            isRecording
              ? "bg-red-500/20 text-red-400 animate-pulse"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
          title={isRecording ? "Stop Recording" : "Start Recording"}
        >
          <Circle className={`h-5 w-5 ${isRecording ? "fill-red-400" : ""}`} />
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Chat */}
        <button
          onClick={() => setSidePanel(sidePanel === "chat" ? null : "chat")}
          className={`p-3 rounded-xl transition-all ${
            sidePanel === "chat"
              ? "bg-[#7401df]/20 text-[#7401df]"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
          title="Chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        {/* Participants */}
        <button
          onClick={() => setSidePanel(sidePanel === "participants" ? null : "participants")}
          className={`p-3 rounded-xl transition-all ${
            sidePanel === "participants"
              ? "bg-[#7401df]/20 text-[#7401df]"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
          title="Participants"
        >
          <Users className="h-5 w-5" />
        </button>

        {/* Reactions */}
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`p-3 rounded-xl transition-all ${
              showReactions
                ? "bg-[#74ddc7]/20 text-[#74ddc7]"
                : "bg-white/10 hover:bg-white/15 text-white"
            }`}
            title="Reactions"
          >
            <SmilePlus className="h-5 w-5" />
          </button>
          {showReactions && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1a1a2e] border border-white/10 rounded-xl px-2 py-1.5 shadow-xl">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setActiveReaction(emoji);
                    setShowReactions(false);
                  }}
                  className="text-xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Leave */}
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Phone className="h-4 w-4 rotate-[135deg]" />
          Leave Meeting
        </button>
      </div>

      {/* ---- SCHEDULE MODAL ---- */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12121c] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#74ddc7]" />
                Meeting Scheduler
              </h2>
              <button
                onClick={() => {
                  setShowSchedule(false);
                  setGeneratedLink("");
                }}
                className="text-white/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Schedule form */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  Schedule a New Meeting
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-white/50 mb-1 block">Meeting Title</Label>
                    <Input
                      value={scheduleForm.title}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                      placeholder="Enter meeting title"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Date</Label>
                    <Input
                      type="date"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Time</Label>
                    <Input
                      type="time"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50 mb-1 block">Duration (minutes)</Label>
                    <select
                      value={scheduleForm.duration}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, duration: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
                    >
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <Switch
                      checked={scheduleForm.recurring}
                      onCheckedChange={(checked) =>
                        setScheduleForm({ ...scheduleForm, recurring: checked })
                      }
                    />
                    <Label className="text-sm text-white/70 flex items-center gap-1.5">
                      <Repeat className="h-3.5 w-3.5" /> Recurring
                    </Label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Input
                    type="email"
                    value={scheduleForm.email}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, email: e.target.value })}
                    placeholder="Invite via email"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <Button
                    size="sm"
                    className="bg-[#7401df] hover:bg-[#7401df]/80 text-white shrink-0"
                    disabled={!scheduleForm.email}
                  >
                    <Mail className="h-4 w-4 mr-1" /> Invite
                  </Button>
                </div>

                <Button
                  onClick={scheduleMeeting}
                  disabled={!scheduleForm.title || !scheduleForm.date || !scheduleForm.time}
                  className="w-full bg-[#74ddc7] hover:bg-[#74ddc7]/80 text-black font-semibold"
                >
                  Generate Meeting Link
                </Button>

                {/* Generated link */}
                {generatedLink && (
                  <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-[#74ddc7] shrink-0" />
                      <span className="text-xs text-white/70 truncate flex-1">{generatedLink}</span>
                      <button
                        onClick={() => copyLink(generatedLink)}
                        className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded flex items-center gap-1 shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedLink ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    {/* QR Code */}
                    <div className="flex justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedLink)}&bgcolor=12121c&color=74ddc7`}
                        alt="Meeting QR Code"
                        className="rounded-lg"
                        width={150}
                        height={150}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upcoming meetings */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                  Upcoming Meetings
                </h3>
                {scheduledMeetings.length === 0 ? (
                  <p className="text-sm text-white/30 text-center py-4">No upcoming meetings</p>
                ) : (
                  <div className="space-y-2">
                    {scheduledMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium flex items-center gap-2">
                            {meeting.title}
                            {meeting.recurring && (
                              <Repeat className="h-3 w-3 text-[#74ddc7]" />
                            )}
                          </p>
                          <p className="text-xs text-white/40 flex items-center gap-2 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(meeting.date + "T" + meeting.time).toLocaleDateString(
                              "en-US",
                              { weekday: "short", month: "short", day: "numeric" }
                            )}{" "}
                            at{" "}
                            {new Date(meeting.date + "T" + meeting.time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ({meeting.duration} min)
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyLink(meeting.link)}
                            className="p-1.5 rounded-md text-white/40 hover:text-[#74ddc7] hover:bg-white/10 transition-colors"
                            title="Copy link"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
