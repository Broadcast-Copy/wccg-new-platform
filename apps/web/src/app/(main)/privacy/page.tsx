import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | WCCG 104.5 FM",
  description: "Privacy policy for WCCG 104.5 FM digital platform and services.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: February 2025
        </p>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Carson Communications / WCCG 104.5 FM (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            operates the WCCG 104.5 FM digital platform at wccg.com. This Privacy Policy explains how
            we collect, use, disclose, and safeguard your information when you visit our website and use
            our services, including streaming, event ticketing, rewards programs, and community features.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may collect personal information that you voluntarily provide when registering for an
            account, subscribing to our services, participating in promotions, or contacting us. This may include:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Name, email address, and contact information</li>
            <li>Account credentials</li>
            <li>Listening preferences and history</li>
            <li>Event attendance and ticket purchases</li>
            <li>mY1045 rewards activity and point balances</li>
            <li>Community directory submissions</li>
            <li>Device and browser information collected automatically</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use the information we collect to provide and improve our services, personalize your
            experience, process transactions, send promotional communications (with your consent),
            manage our rewards program, and comply with legal obligations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Sharing of Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal information to third parties. We may share your information
            with service providers who assist in operating our platform, event partners for ticketing
            purposes, and as required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures to protect your personal information.
            However, no method of transmission over the Internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may access, update, or delete your account information at any time through your
            dashboard settings. You may also opt out of promotional communications by following
            the unsubscribe instructions in our emails.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Carson Communications / WCCG 104.5 FM</p>
            <p>115 Gillespie Street</p>
            <p>Fayetteville, NC 28301</p>
            <p>(910) 484-4932</p>
          </div>
        </section>
      </div>
    </div>
  );
}
