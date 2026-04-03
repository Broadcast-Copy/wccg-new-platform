import { Gift, Users, Star, Trophy, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Invite Friends & Earn Points | WCCG 104.5 FM",
  description:
    "Refer friends to WCCG 104.5 FM and earn mY1045 points. Invite 3 friends and unlock a 500-point bonus. Start earning rewards today.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    num: 1,
    icon: Sparkles,
    title: "Sign Up Free",
    description:
      "Create your free mY1045 account in under 30 seconds. No credit card required.",
  },
  {
    num: 2,
    icon: Users,
    title: "Share Your Code",
    description:
      "Send your unique referral code or link to friends via text, social media, or email.",
  },
  {
    num: 3,
    icon: Gift,
    title: "Earn Points",
    description:
      "When your friends sign up and start listening, you both earn bonus points automatically.",
  },
];

const TIERS = [
  { friends: 1, points: "100", label: "Starter", color: "text-teal-400" },
  { friends: 3, points: "500", label: "Bonus Tier", color: "text-teal-300" },
  { friends: 5, points: "1,000", label: "Power Referrer", color: "text-purple-400" },
  { friends: 10, points: "2,500", label: "Ambassador", color: "text-purple-300" },
];

const FAQS = [
  {
    q: "How does the referral program work?",
    a: "After signing up, you get a unique referral link. When someone joins WCCG using your link, both of you earn points. Hit milestones like 3 or 10 friends to unlock bonus tiers.",
  },
  {
    q: "When do I receive my points?",
    a: "Points are credited instantly once your friend creates an account and verifies their email. Bonus-tier points are added automatically when you hit each milestone.",
  },
  {
    q: "Is there a limit to how many friends I can refer?",
    a: "No limit! Invite as many friends as you want. The more you refer, the more you earn. Top referrers are featured on our leaderboard.",
  },
  {
    q: "What can I do with my points?",
    a: "Redeem points for merchandise, event tickets, exclusive meet-and-greets, gift cards, and more on the Rewards page.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function InvitePage() {
  return (
    <div className="space-y-12">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900 via-teal-800/60 to-purple-900 border border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(20,184,166,.15),transparent_60%)]" />
        <div className="relative px-6 py-14 sm:px-10 sm:py-20 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-purple-500 shadow-xl">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Invite 3 Friends, Get{" "}
            <span className="bg-gradient-to-r from-teal-300 to-purple-300 bg-clip-text text-transparent">
              500 Bonus Points
            </span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-xl mx-auto">
            Share WCCG 104.5 FM with your friends and earn mY1045 points every
            time someone signs up. More friends, bigger rewards.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/register">
              <Button className="rounded-full bg-teal-500 hover:bg-teal-400 text-white font-bold px-8 py-3 text-base">
                Sign Up &amp; Get Your Code
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/my/referral">
              <Button
                variant="outline"
                className="rounded-full border-white/20 text-white hover:bg-white/10 px-8 py-3 text-base"
              >
                I Have an Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-foreground text-center">
          How It Works
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card
              key={step.num}
              className="border-border bg-card hover:border-input transition-all"
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
                  <step.icon className="h-6 w-6 text-teal-400" />
                </div>
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-teal-400">
                  Step {step.num}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Reward Tiers ── */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">Reward Tiers</h2>
          <p className="text-sm text-muted-foreground">
            The more friends you invite, the bigger the bonus
          </p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <Card
              key={tier.friends}
              className="border-border bg-card hover:border-input transition-all"
            >
              <CardContent className="p-5 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                  <Trophy className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {tier.friends} {tier.friends === 1 ? "Friend" : "Friends"}
                </p>
                <p className={`text-2xl font-extrabold ${tier.color}`}>
                  {tier.points}
                  <span className="text-sm font-semibold"> pts</span>
                </p>
                <p className="text-xs font-medium text-foreground/60">
                  {tier.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="text-center py-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-5 py-2.5">
          <Star className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-medium text-teal-300">
            Join 1,000+ listeners earning rewards on WCCG
          </span>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="space-y-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-semibold text-foreground">{faq.q}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="text-center py-8 space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Ready to start earning?
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Create your free account and grab your referral link in seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register">
            <Button className="rounded-full bg-teal-500 hover:bg-teal-400 text-white font-bold px-8">
              Sign Up &amp; Get Your Code
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/my/referral">
            <Button
              variant="outline"
              className="rounded-full border-border text-foreground hover:bg-foreground/5 px-8"
            >
              I Have an Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
