"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Save,
  Instagram,
  Facebook,
  Youtube,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

interface HostProfile {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  socialFacebook?: string;
  socialTiktok?: string;
  socialYoutube?: string;
}

export default function DashboardProfilePage() {
  const { isLoading: authLoading } = useAuth();
  const [hostId, setHostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");

  useEffect(() => {
    if (authLoading) return;

    async function fetchProfile() {
      try {
        const profile = await apiClient<HostProfile>("/hosts/me");
        setHostId(profile.id);
        setName(profile.name || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatarUrl || "");
        setSocialInstagram(profile.socialInstagram || "");
        setSocialTwitter(profile.socialTwitter || "");
        setSocialFacebook(profile.socialFacebook || "");
        setSocialTiktok(profile.socialTiktok || "");
        setSocialYoutube(profile.socialYoutube || "");
      } catch {
        // Host profile not found - may need to be created by admin
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [authLoading]);

  async function handleSave() {
    if (!hostId) {
      toast.error("No host profile linked to your account.");
      return;
    }

    setSaving(true);
    try {
      await apiClient(`/hosts/${hostId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name || undefined,
          bio: bio || undefined,
          avatarUrl: avatarUrl || undefined,
          socialInstagram: socialInstagram || undefined,
          socialTwitter: socialTwitter || undefined,
          socialFacebook: socialFacebook || undefined,
          socialTiktok: socialTiktok || undefined,
          socialYoutube: socialYoutube || undefined,
        }),
      });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to save profile");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your DJ/Host profile information
          </p>
        </div>
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>Loading profile...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hostId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your DJ/Host profile information
          </p>
        </div>
        <Card className="border-white/10 bg-[#12121a]">
          <CardContent className="flex h-48 flex-col items-center justify-center">
            <User className="mb-3 size-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No host profile is linked to your account yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact an administrator to set up your host profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your DJ/Host profile information
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#74ddc7] text-black hover:bg-[#5fc4b0]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Save Profile
            </>
          )}
        </Button>
      </div>

      {/* Basic Info */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader>
          <CardTitle className="text-white">Basic Information</CardTitle>
          <CardDescription>
            Your public profile details visible to listeners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Display Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="DJ Name"
              className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your listeners about yourself..."
              rows={5}
              className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl" className="text-white">
              Avatar URL
            </Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
            />
            {avatarUrl && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="size-20 rounded-full border border-white/10 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="border-white/10 bg-[#12121a]">
        <CardHeader>
          <CardTitle className="text-white">Social Links</CardTitle>
          <CardDescription>
            Connect your social media accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="socialInstagram"
                className="flex items-center gap-2 text-white"
              >
                <Instagram className="size-4 text-pink-400" />
                Instagram
              </Label>
              <Input
                id="socialInstagram"
                value={socialInstagram}
                onChange={(e) => setSocialInstagram(e.target.value)}
                placeholder="@yourusername"
                className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="socialTwitter"
                className="flex items-center gap-2 text-white"
              >
                <svg
                  className="size-4 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter / X
              </Label>
              <Input
                id="socialTwitter"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                placeholder="@yourusername"
                className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="socialFacebook"
                className="flex items-center gap-2 text-white"
              >
                <Facebook className="size-4 text-blue-400" />
                Facebook
              </Label>
              <Input
                id="socialFacebook"
                value={socialFacebook}
                onChange={(e) => setSocialFacebook(e.target.value)}
                placeholder="facebook.com/yourpage"
                className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="socialTiktok"
                className="flex items-center gap-2 text-white"
              >
                <svg
                  className="size-4 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.1a8.16 8.16 0 0 0 4.76 1.52v-3.4c-.87 0-1.7-.2-2.46-.55l.01.02z" />
                </svg>
                TikTok
              </Label>
              <Input
                id="socialTiktok"
                value={socialTiktok}
                onChange={(e) => setSocialTiktok(e.target.value)}
                placeholder="@yourusername"
                className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="space-y-2">
            <Label
              htmlFor="socialYoutube"
              className="flex items-center gap-2 text-white"
            >
              <Youtube className="size-4 text-red-500" />
              YouTube Channel URL
            </Label>
            <Input
              id="socialYoutube"
              value={socialYoutube}
              onChange={(e) => setSocialYoutube(e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
              className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#74ddc7] text-black hover:bg-[#5fc4b0]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
