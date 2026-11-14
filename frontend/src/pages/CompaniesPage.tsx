import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Building2, Search, ArrowRight, ExternalLink, Loader2, Database } from "lucide-react";
import { blurFadeIn } from "../lib/motion";
import { Button } from "../components/Button";

interface CompanyItem {
  id: number;
  ticker: string;
  name: string;
  cik: string;
  sic: string;
  fiscal_year_end: string;
}

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/companies");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCompanies(data);
      } catch (err: any) {
        setError(err.message || "Failed to load SEC company registry.");
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const filtered = companies.filter(
    (c) =>
      c.ticker.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.cik.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div variants={blurFadeIn} initial="hidden" animate="visible" className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[rgba(64,88,129,0.12)] text-xs font-semibold text-[#273869] shadow-soft-sm">
          <Database className="w-3.5 h-3.5 text-[#273869]" />
          <span>SEC EDGAR Benchmark Directory</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#273869]">
          Registered <span className="font-serif-accent font-normal text-4xl text-[#273869]">Entities.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#405881]">
          Pre-indexed public corporate filers with active SEC Submissions and CompanyFacts caches.
        </p>
      </motion.div>

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#405881]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by ticker, company name, or CIK..."
            className="w-full pl-9 pr-4 py-2 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.14)] rounded-xl text-xs text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs text-[#405881] font-mono self-center">
          Active Registry: {filtered.length} Entities
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-12 text-center text-[#405881] space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#273869]" />
          <p className="text-xs">Connecting to SEC EDGAR database...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="p-12 bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] text-center space-y-3 shadow-soft-sm">
          <Building2 className="w-8 h-8 text-[#405881] mx-auto" />
          <h3 className="font-bold text-sm text-[#273869]">No matching entities found</h3>
          <p className="text-xs text-[#405881]">
            No records matched your search query in the SEC EDGAR benchmark registry.
          </p>
        </div>
      )}

      {/* Company Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <motion.div
              key={c.ticker}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] p-5 shadow-soft-sm hover:shadow-soft-md hover:border-[#273869] transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#273869] tracking-tight">{c.ticker}</span>
                  <span className="font-mono text-[10px] text-[#405881] bg-[#EDF1F4] px-2 py-0.5 rounded-md">
                    CIK {c.cik}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#273869] leading-snug">{c.name}</h3>
                <div className="text-xs text-[#405881] space-y-1 font-mono pt-1">
                  <div>SIC Industry: {c.sic}</div>
                  <div>Fiscal Year End: {c.fiscal_year_end}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-[rgba(64,88,129,0.08)] flex items-center justify-between">
                <a
                  href={`https://www.sec.gov/edgar/browse/?CIK=${c.cik}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-[#405881] hover:text-[#273869]"
                >
                  <span>SEC EDGAR</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/workbench?ticker=${c.ticker}`)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Pre-Audit
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

