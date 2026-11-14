import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-[rgba(64,88,129,0.12)] bg-[#EDF1F4] py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
        <div className="space-y-3 max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#273869] text-white flex items-center justify-center font-bold text-xs">
              M
            </div>
            <span className="font-bold text-sm tracking-tight text-[#273869]">MONETA AUDIT PLATFORM</span>
          </div>
          <p className="text-xs text-[#405881] leading-relaxed">
            Institutional-grade pre-audit engine for SEC XBRL and corporate financial disclosures.
            Automated tie-outs, roll-forward reconciliations, and discrepancy verification.
          </p>
          <div className="text-[11px] text-[#405881]/80">
            SEC EDGAR User-Agent: <code className="tabular-nums font-mono text-xs">MonetaPreAudit team@moneta-audit.local</code>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
          <div className="space-y-2.5">
            <div className="font-semibold text-[#273869] tracking-wider uppercase text-[10px]">Product</div>
            <ul className="space-y-1.5 text-[#405881]">
              <li><Link to="/workbench" className="hover:text-[#273869] transition-colors">Audit Workbench</Link></li>
              <li><Link to="/companies" className="hover:text-[#273869] transition-colors">SEC Benchmark Directory</Link></li>
              <li><Link to="/upload" className="hover:text-[#273869] transition-colors">Statement Ingestion (CSV/PDF)</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-[#273869] tracking-wider uppercase text-[10px]">Compliance</div>
            <ul className="space-y-1.5 text-[#405881]">
              <li><Link to="/privacy" className="hover:text-[#273869] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#273869] transition-colors">Terms of Service</Link></li>
              <li><a href="https://www.sec.gov/edgar" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#273869] transition-colors">SEC EDGAR <ExternalLink className="w-3 h-3" /></a></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-[#273869] tracking-wider uppercase text-[10px]">Governance</div>
            <div className="text-[11px] text-[#405881] space-y-1">
              <p>Moneta Systems Inc.</p>
              <p>Corporation Trust Center, 1209 Orange St, Wilmington, DE 19801</p>
              <p className="text-[#273869] font-medium">audit-ops@moneta-audit.local</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-[rgba(64,88,129,0.08)] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#405881]">
        <div>© {new Date().getFullYear()} Moneta Systems Inc. All rights reserved. Strict GAAP/IFRS validation protocol.</div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span>Zero AI Slop Architecture</span>
          <span>•</span>
          <span>Deterministic Verification</span>
        </div>
      </div>
    </footer>
  );
};
