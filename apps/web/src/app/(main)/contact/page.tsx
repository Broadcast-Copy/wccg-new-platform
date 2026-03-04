"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  Music,
  Megaphone,
  MessageSquare,
  Headphones,
} from "lucide-react";

type FormType = "general" | "music" | "advertiser" | "creator";

interface FormState {
  submitted: boolean;
  submitting: boolean;
  error: string | null;
}

export default function ContactPage() {
  const [activeForm, setActiveForm] = useState<FormType>("general");
  const [formState, setFormState] = useState<FormState>({
    submitted: false,
    submitting: false,
    error: null,
  });

  // Auto-select tab based on URL hash (e.g., /contact#advertise)
  useEffect(() => {
    const hashMap: Record<string, FormType> = {
      "#advertise": "advertiser",
      "#submit-music": "music",
      "#creator-services": "creator",
    };
    const tab = hashMap[window.location.hash];
    if (tab) setActiveForm(tab);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState({ submitted: false, submitting: true, error: null });

    // Simulate form submission
    setTimeout(() => {
      setFormState({ submitted: true, submitting: false, error: null });
    }, 1500);
  }

  function resetForm() {
    setFormState({ submitted: false, submitting: false, error: null });
  }

  const formTabs = [
    { id: "general" as const, label: "General Inquiry", icon: MessageSquare },
    { id: "music" as const, label: "Submit Music", icon: Music },
    { id: "advertiser" as const, label: "Advertise", icon: Megaphone },
    { id: "creator" as const, label: "Creator Services", icon: Headphones },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-purple-900/80 to-teal-900/60 p-8 sm:p-12 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-teal-400 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-400 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Connect With Us
          </h1>
          <p className="mt-3 text-white/70 text-lg">
            Reach out to the WCCG 104.5 FM team. Whether you have a question,
            want to submit music, or explore advertising opportunities, we&apos;re
            here to help.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Carson Communications</p>
                  <p className="text-sm text-muted-foreground">
                    115 Gillespie Street<br />
                    Fayetteville, NC 28301
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <a href="tel:9104844932" className="text-sm hover:text-primary transition-colors">
                    (910) 484-4932
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <a href="mailto:info@wccg1045fm.com" className="text-sm hover:text-primary transition-colors">
                    info@wccg1045fm.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Office Hours</p>
                  <p className="text-sm text-muted-foreground">
                    Mon–Fri: 8:30 AM – 5:30 PM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department Emails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Programming</p>
                <a href="mailto:programming@wccg1045fm.com" className="text-sm hover:text-primary transition-colors">
                  programming@wccg1045fm.com
                </a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sales &amp; Advertising</p>
                <a href="mailto:sales@wccg1045fm.com" className="text-sm hover:text-primary transition-colors">
                  sales@wccg1045fm.com
                </a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">News Tips</p>
                <a href="mailto:news@wccg1045fm.com" className="text-sm hover:text-primary transition-colors">
                  news@wccg1045fm.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forms Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Form Tabs */}
          <div className="flex flex-wrap gap-2">
            {formTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeForm === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => { setActiveForm(tab.id); resetForm(); }}
                className="gap-2"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Success State */}
          {formState.submitted ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="py-12 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">
                  {activeForm === "general" && "Message Sent!"}
                  {activeForm === "music" && "Music Submitted!"}
                  {activeForm === "advertiser" && "Inquiry Received!"}
                  {activeForm === "creator" && "Request Submitted!"}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {activeForm === "general" &&
                    "Thank you for reaching out. Our team will review your message and get back to you within 1\u20132 business days."}
                  {activeForm === "music" &&
                    "Your music submission is in our queue! Our programming team will listen and follow up if it\u2019s a fit for WCCG 104.5 FM."}
                  {activeForm === "advertiser" &&
                    "Thanks for your interest in advertising with us! A member of our sales team will contact you to schedule a free consultation."}
                  {activeForm === "creator" &&
                    "We\u2019ve received your creator services request. Our production team will reach out to discuss your project details."}
                </p>
                <Button onClick={resetForm} variant="outline" className="gap-2">
                  <Send className="h-4 w-4" />
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* General Inquiry Form */}
              {activeForm === "general" && (
                <Card>
                  <CardHeader>
                    <CardTitle>General Inquiry</CardTitle>
                    <CardDescription>
                      Have a question or comment? Send us a message.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input id="name" placeholder="Your name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input id="email" type="email" placeholder="you@example.com" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" placeholder="What's this about?" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea id="message" placeholder="Tell us what's on your mind..." rows={5} required />
                      </div>
                      <Button type="submit" disabled={formState.submitting} className="gap-2">
                        <Send className="h-4 w-4" />
                        {formState.submitting ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Music Submission Form */}
              {activeForm === "music" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Your Music</CardTitle>
                    <CardDescription>
                      Send us your tracks for potential airplay on WCCG 104.5 FM.
                      We accept MP3 and WAV formats.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="artist-name">Artist / Stage Name *</Label>
                          <Input id="artist-name" placeholder="Your artist name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="legal-name">Legal Name *</Label>
                          <Input id="legal-name" placeholder="Your legal name" required />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="contact-email">Email *</Label>
                          <Input id="contact-email" type="email" placeholder="you@example.com" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone *</Label>
                          <Input id="phone" type="tel" placeholder="(555) 123-4567" required />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input id="city" placeholder="Fayetteville" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State *</Label>
                          <Input id="state" placeholder="NC" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="social-links">Website / Social Media Links</Label>
                        <Input id="social-links" placeholder="Instagram, Spotify, etc." />
                      </div>
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3">Song Details</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="song-title">Song Title *</Label>
                            <Input id="song-title" placeholder="Track name" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="genre">Genre *</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select genre" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hiphop">Hip-Hop</SelectItem>
                                <SelectItem value="rnb">R&amp;B</SelectItem>
                                <SelectItem value="gospel">Gospel</SelectItem>
                                <SelectItem value="pop">Pop</SelectItem>
                                <SelectItem value="reggae">Reggae</SelectItem>
                                <SelectItem value="afrobeats">Afrobeats</SelectItem>
                                <SelectItem value="dancehall">Dancehall</SelectItem>
                                <SelectItem value="soul">Soul</SelectItem>
                                <SelectItem value="jazz">Jazz</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="version">Version Submitted</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clean">Clean (Radio Edit)</SelectItem>
                              <SelectItem value="dirty">Dirty</SelectItem>
                              <SelectItem value="instrumental">Instrumental</SelectItem>
                              <SelectItem value="acapella">Acapella</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="song-desc">Brief Description</Label>
                          <Textarea id="song-desc" placeholder="Tell us about your song or project..." rows={3} />
                        </div>
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="music-link">Music File Link *</Label>
                          <Input id="music-link" placeholder="Dropbox, Google Drive, or streaming link" required />
                          <p className="text-xs text-muted-foreground">
                            Share a link to your MP3/WAV file (Dropbox, Google Drive, SoundCloud, etc.)
                          </p>
                        </div>
                      </div>
                      <Button type="submit" disabled={formState.submitting} className="gap-2">
                        <Music className="h-4 w-4" />
                        {formState.submitting ? "Submitting..." : "Submit Music"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Advertiser Inquiry Form */}
              {activeForm === "advertiser" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Advertise With Us</CardTitle>
                    <CardDescription>
                      Reach the Fayetteville community through radio spots, streaming,
                      social media, events, and marketplace listings. Schedule a free consultation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="biz-name">Business Name *</Label>
                          <Input id="biz-name" placeholder="Your business name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-name">Contact Person *</Label>
                          <Input id="contact-name" placeholder="Your name" required />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="adv-email">Email *</Label>
                          <Input id="adv-email" type="email" placeholder="you@business.com" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="adv-phone">Phone *</Label>
                          <Input id="adv-phone" type="tel" placeholder="(555) 123-4567" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ad-interest">Advertising Interest</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="What are you interested in?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="radio">Radio Spots (On-Air)</SelectItem>
                            <SelectItem value="streaming">Streaming Ads</SelectItem>
                            <SelectItem value="social">Social Media Promotion</SelectItem>
                            <SelectItem value="events">Event Sponsorship</SelectItem>
                            <SelectItem value="marketplace">Marketplace Listing</SelectItem>
                            <SelectItem value="package">Custom Package</SelectItem>
                            <SelectItem value="unsure">Not Sure Yet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budget">Monthly Budget Range</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select budget range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under500">Under $500</SelectItem>
                            <SelectItem value="500-1000">$500 – $1,000</SelectItem>
                            <SelectItem value="1000-2500">$1,000 – $2,500</SelectItem>
                            <SelectItem value="2500-5000">$2,500 – $5,000</SelectItem>
                            <SelectItem value="5000+">$5,000+</SelectItem>
                            <SelectItem value="discuss">Prefer to Discuss</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ad-message">Tell Us About Your Goals *</Label>
                        <Textarea
                          id="ad-message"
                          placeholder="What are you looking to achieve? Target audience, timeline, etc."
                          rows={4}
                          required
                        />
                      </div>
                      <Button type="submit" disabled={formState.submitting} className="gap-2">
                        <Megaphone className="h-4 w-4" />
                        {formState.submitting ? "Submitting..." : "Request Consultation"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Creator Services Form */}
              {activeForm === "creator" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Creator Services</CardTitle>
                    <CardDescription>
                      Explore studio production, podcast launches, video production,
                      voiceover, and live-on-site services at the Carson Communications
                      Innovation Center.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="cr-name">Your Name *</Label>
                          <Input id="cr-name" placeholder="Full name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cr-email">Email *</Label>
                          <Input id="cr-email" type="email" placeholder="you@example.com" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cr-phone">Phone</Label>
                        <Input id="cr-phone" type="tel" placeholder="(555) 123-4567" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-type">Service Interested In *</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="studio">Studio Production</SelectItem>
                            <SelectItem value="podcast">Podcast Launch</SelectItem>
                            <SelectItem value="video">Video Production</SelectItem>
                            <SelectItem value="voiceover">Voice-Over / Narration</SelectItem>
                            <SelectItem value="social">Social Content Creation</SelectItem>
                            <SelectItem value="live">Live On-Site Services</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-desc">Project Description *</Label>
                        <Textarea
                          id="project-desc"
                          placeholder="Describe your project, timeline, and any specific needs..."
                          rows={4}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="portfolio">Portfolio / Website</Label>
                        <Input id="portfolio" placeholder="Link to your work (optional)" />
                      </div>
                      <Button type="submit" disabled={formState.submitting} className="gap-2">
                        <Headphones className="h-4 w-4" />
                        {formState.submitting ? "Submitting..." : "Submit Request"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
