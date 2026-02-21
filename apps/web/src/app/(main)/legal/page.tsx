import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal | WCCG 104.5 FM",
  description: "Legal information, FCC compliance, and regulatory notices for WCCG 104.5 FM.",
};

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Legal</h1>
        <p className="text-muted-foreground">
          Regulatory compliance and legal notices for WCCG 104.5 FM.
        </p>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        {/* Quick Links */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Legal Documents</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/privacy"
              className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 text-teal-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Privacy Policy</p>
                <p className="text-xs text-muted-foreground">How we handle your data</p>
              </div>
            </Link>
            <Link
              href="/terms"
              className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Terms of Service</p>
                <p className="text-xs text-muted-foreground">Platform usage terms</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Station Information</h2>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <span className="font-medium text-foreground">Call Letters:</span>
              <span>WCCG</span>
              <span className="font-medium text-foreground">Frequency:</span>
              <span>104.5 FM</span>
              <span className="font-medium text-foreground">Licensee:</span>
              <span>Carson Communications</span>
              <span className="font-medium text-foreground">Location:</span>
              <span>Fayetteville, North Carolina</span>
              <span className="font-medium text-foreground">Format:</span>
              <span>Hip Hop, R&amp;B, Sports &amp; Talk</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">FCC Compliance</h2>
          <p className="text-muted-foreground leading-relaxed">
            WCCG 104.5 FM is licensed by the Federal Communications Commission (FCC) and operates in
            full compliance with FCC regulations. Our public inspection file is available through the
            FCC&apos;s online public file system.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Equal Employment Opportunity (EEO)</h2>
          <p className="text-muted-foreground leading-relaxed">
            Carson Communications is an Equal Opportunity Employer. We are committed to providing equal
            employment opportunities regardless of race, color, religion, gender, national origin,
            disability, or veteran status.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Copyright Notice</h2>
          <p className="text-muted-foreground leading-relaxed">
            All content on this platform, including but not limited to audio streams, text, graphics,
            logos, images, and software, is the property of Carson Communications or its respective
            rights holders and is protected by United States and international copyright laws.
            Unauthorized reproduction or distribution is prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For legal inquiries, please contact:
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
