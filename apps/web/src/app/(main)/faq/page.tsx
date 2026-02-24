import { HelpCircle, Radio, Gift, Headphones, Users2, Mail } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "FAQ | WCCG 104.5 FM",
  description: "Frequently asked questions about WCCG 104.5 FM, streaming, events, and the mY1045 platform.",
};

const faqs = [
  {
    category: "Listening",
    icon: Headphones,
    items: [
      { q: "How do I listen to WCCG 104.5 FM online?", a: "Visit our Channel Guide and click any of our 6 live streams. You can also listen through our mobile app or any smart speaker by saying 'Play WCCG 104.5 FM.'" },
      { q: "What channels are available?", a: "We offer 6 channels: WCCG 104.5 (Hip Hop & R&B), Soul 104.5, Hot 104.5, Vibe 104.5, The Yard, and MixSquad Radio." },
      { q: "Is streaming free?", a: "Yes! All 6 channels stream 24/7 for free. Some premium features may require a mY1045 account." },
    ],
  },
  {
    category: "mY1045 Perks",
    icon: Gift,
    items: [
      { q: "What is mY1045 Perks?", a: "mY1045 Perks is our listener rewards program. Earn points by listening, attending events, and engaging with the platform. Redeem points for merch, tickets, and exclusive experiences." },
      { q: "How do I earn points?", a: "Listen to live streams, attend WCCG events, refer friends, complete your profile, and participate in contests to earn points." },
      { q: "How do I redeem rewards?", a: "Visit the Perks page in your dashboard to browse available rewards and redeem your points." },
    ],
  },
  {
    category: "Events",
    icon: Users2,
    items: [
      { q: "How do I find upcoming events?", a: "Check our Events page for concerts, community events, and exclusive WCCG experiences in the Fayetteville area." },
      { q: "Can I host an event with WCCG?", a: "Yes! Contact us through our Advertise page or reach out to our events team to discuss partnerships and event hosting." },
    ],
  },
  {
    category: "For Artists & Creators",
    icon: Radio,
    items: [
      { q: "How do I submit my music?", a: "Visit our Submit Music page to upload your tracks for consideration. Our programming team reviews all submissions." },
      { q: "Can I start a podcast on WCCG?", a: "Yes! Check out our Creators page to learn about podcast hosting and content creation opportunities." },
    ],
  },
  {
    category: "Contact & Support",
    icon: Mail,
    items: [
      { q: "How do I contact WCCG?", a: "Call us at (910) 484-4932, email info@wccg1045fm.com, or visit our studio at 115 Gillespie Street, Fayetteville, NC 28301." },
      { q: "What are your office hours?", a: "Monday through Friday, 8:30 AM – 5:30 PM. Our streams broadcast 24/7." },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl">
              <HelpCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Frequently Asked Questions</h1>
              <p className="text-white/50 mt-1">Everything you need to know about WCCG 104.5 FM</p>
            </div>
          </div>
        </div>
      </div>

      {faqs.map((section) => (
        <section key={section.category} className="space-y-4">
          <div className="flex items-center gap-2">
            <section.icon className="h-5 w-5 text-[#74ddc7]" />
            <h2 className="text-xl font-semibold text-white">{section.category}</h2>
          </div>
          <div className="space-y-3">
            {section.items.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 text-white font-medium hover:bg-white/[0.02] transition-colors">
                  {faq.q}
                  <span className="ml-4 text-white/30 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-white/60 leading-relaxed border-t border-white/[0.04] pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-white/50 text-sm">
          Still have questions?{" "}
          <Link href="/contact" className="text-[#74ddc7] hover:underline">Contact us</Link>
          {" "}and we&apos;ll be happy to help.
        </p>
      </div>
    </div>
  );
}
