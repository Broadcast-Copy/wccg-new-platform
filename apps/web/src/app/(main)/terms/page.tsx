import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | WCCG 104.5 FM",
  description: "Terms of service for WCCG 104.5 FM digital platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">
          Last updated: February 2025
        </p>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using the WCCG 104.5 FM digital platform (&quot;Platform&quot;), operated
            by Carson Communications, you agree to be bound by these Terms of Service. If you do not
            agree, please do not use the Platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Use of Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our Platform provides radio streaming, event discovery and ticketing, a community
            business directory, a marketplace, and a listener rewards program (mY1045 Perks).
            You agree to use these services only for lawful purposes and in accordance with these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Account Registration</h2>
          <p className="text-muted-foreground leading-relaxed">
            Some features require you to create an account. You are responsible for maintaining the
            confidentiality of your login credentials and for all activity that occurs under your
            account. You agree to provide accurate information and to update it as necessary.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. mY1045 Rewards Program</h2>
          <p className="text-muted-foreground leading-relaxed">
            Points earned through the mY1045 Perks program have no cash value and cannot be transferred,
            sold, or exchanged for currency. Points may expire after 12 months of account inactivity.
            We reserve the right to modify or discontinue the rewards program at any time.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Events and Ticketing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Event listings on our Platform are provided for informational purposes. Ticket purchases
            are subject to the terms of the event organizer. Refund policies are determined by
            individual event organizers unless otherwise stated.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Community Directory &amp; Marketplace</h2>
          <p className="text-muted-foreground leading-relaxed">
            Listings in the community directory and marketplace are provided by third-party businesses.
            WCCG 104.5 FM does not endorse or guarantee the products, services, or accuracy of
            information provided by listed businesses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            All content on the Platform, including audio streams, text, graphics, logos, and software,
            is the property of Carson Communications or its licensors and is protected by copyright
            and other intellectual property laws.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the fullest extent permitted by law, Carson Communications / WCCG 104.5 FM shall not
            be liable for any indirect, incidental, or consequential damages arising from your use of
            the Platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to update these Terms at any time. Continued use of the Platform
            after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at:
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
