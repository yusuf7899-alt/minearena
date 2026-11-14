import React from "react";
import { motion } from "motion/react";
import { blurFadeIn } from "../lib/motion";
import { CheckCircle2 } from "lucide-react";

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <motion.div
        variants={blurFadeIn}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#273869] text-xs font-semibold border border-[rgba(64,88,129,0.12)]">
          <span>Legal</span>
          <span className="text-[#405881]">Statutory Compliance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#273869]">
          Privacy <span className="font-serif-accent font-normal text-4xl sm:text-5xl text-[#273869]">Policy.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#405881]">
          Effective Date: November 13, 2026 • Moneta Systems Inc. (Delaware Corporation)
        </p>
      </motion.div>

      <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-8 space-y-8 text-xs sm:text-sm leading-relaxed text-[#405881]">
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#273869]">1. Information We Collect</h2>
          <p>
            Moneta Systems Inc. (&quot;Moneta&quot;, &quot;we&quot;, &quot;our&quot;) provides automated pre-audit verification services for public and corporate financial filings. In operating the platform, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[#273869]">
            <li><strong>Account Credentials:</strong> Full name, institutional email address, and cryptographically salted password hashes.</li>
            <li><strong>Audit Input Data:</strong> Corporate financial statements (CSV, PDF, or SEC EDGAR CIK identifiers) submitted by authorized reviewers.</li>
            <li><strong>System Metadata:</strong> IP address, user agent, timestamps, and audit reconciliation logs.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#273869]">2. Treatment of Financial Statement Data</h2>
          <p>
            All submitted SEC EDGAR documents and uploaded balance sheets are treated as <em>untrusted external inputs</em>. In adherence with our AI safety rules:
          </p>
          <div className="p-4 rounded-xl bg-[#EDF1F4]/60 border border-[rgba(64,88,129,0.1)] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#273869]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Zero LLM Model Training</span>
            </div>
            <p>
              Uploaded financial filings are never used to train, fine-tune, or calibrate public or third-party artificial intelligence models.
            </p>
            <div className="flex items-center gap-2 font-semibold text-[#273869] pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Read-Only Extraction Sandboxing</span>
            </div>
            <p>
              Filing chunks are processed strictly in an isolated deterministic sandbox for mathematical tie-out reconciliation and XBRL concordance.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#273869]">3. SEC EDGAR API Rate Limiting Compliance</h2>
          <p>
            When querying the SEC EDGAR API, Moneta automatically enforces the SEC regulatory limit of no more than 10 requests per second, capped by default at 5 requests per second with an authentic institutional User-Agent header (<code>MonetaPreAudit team@moneta-audit.local</code>).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#273869]">4. Contact & Regulatory Inquiries</h2>
          <p>
            Inquiries regarding data rights, verification records, or SOC2 Type II certifications may be directed to:
          </p>
          <div className="font-mono text-xs text-[#273869] bg-[#EDF1F4] p-3 rounded-xl border border-[rgba(64,88,129,0.1)]">
            Moneta Systems Inc.<br />
            Corporation Trust Center, 1209 Orange St, Wilmington, DE 19801<br />
            Email: compliance@moneta-audit.local
          </div>
        </section>
      </div>
    </div>
  );
};
