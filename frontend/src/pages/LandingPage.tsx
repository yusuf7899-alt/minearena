import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  Zap,
  CheckCircle2,
  Database,
  Scale,
  Eye,
  EyeOff
} from "lucide-react";
import { blurFadeIn, staggerContainer, cardHover } from "../lib/motion";
import { Button } from "../components/Button";

interface CompanyItem {
  ticker: string;
  name: string;
  cik: string;
  sic: string;
  fiscal_year_end: string;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [showFigure, setShowFigure] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCompanies(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="pt-10 sm:pt-14 max-w-6xl mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-center space-y-6 max-w-3xl mx-auto"
        >
          {/* Section Chip */}
          <motion.div
            variants={blurFadeIn}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[rgba(64,88,129,0.14)] shadow-soft-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#D94B1E]" />
            <span className="text-xs font-semibold text-[#273869] tracking-wide">
              SEC EDGAR Autonomous Pre-Audit
            </span>
          </motion.div>

          <motion.h1
            variants={blurFadeIn}
            className="text-4xl sm:text-6xl font-bold tracking-tight text-[#273869] leading-[1.1]"
          >
            Autonomous Financial Pre-Audit.{" "}
            <span className="font-serif-accent font-normal text-5xl sm:text-7xl block sm:inline text-[#273869]">
              That&apos;s it.
            </span>
          </motion.h1>

          <motion.p
            variants={blurFadeIn}
            className="text-xs sm:text-base text-[#405881] max-w-2xl mx-auto leading-relaxed"
          >
            Deterministic verification of public corporate filings. Instant mathematical tie-outs ($A = L + E$), retained earnings roll-forwards, statement of cash flows reconciliation, and multi-factor confidence scoring.
          </motion.p>

          <motion.div
            variants={blurFadeIn}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/workbench")}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Launch Audit Terminal
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/companies")}
              icon={<Database className="w-4 h-4" />}
            >
              Browse Benchmark Registry
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Flagship Token Preview Cards (Directly matching Slide 7 Specification) */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Architectural Hero Glass Card (Glass treatment on hero card only) */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white/85 backdrop-blur-md rounded-2xl border border-[rgba(64,88,129,0.14)] shadow-soft-md p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#273869] text-white flex items-center justify-center font-bold text-xs">
                    M
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#273869] block">SEC EDGAR Protocol</span>
                    <span className="text-[11px] text-[#405881]">Seven Statutory Tie-Outs</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFigure(!showFigure)}
                  title={showFigure ? "Hide sensitive figure" : "Show figure"}
                  aria-label={showFigure ? "Hide sensitive figure" : "Show figure"}
                  className="p-1.5 text-[#405881] hover:text-[#273869] rounded-lg transition-colors cursor-pointer"
                >
                  {showFigure ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="my-5">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-[#405881] mb-1">
                  Automated Calibration
                </div>
                <div className="text-3xl font-bold text-[#273869] tabular-nums tracking-tight">
                  {showFigure ? "100.0%" : "••••••"}
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0FDF4] border border-[#86EFAC] text-[#15803D] text-xs font-semibold self-start">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full Benchmark Concordance</span>
            </div>
          </motion.div>

          {/* Card 2: Solid Navy Card */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-md p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#EDF1F4] flex items-center justify-center text-[#273869]">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#273869] block">Four-Factor Model</span>
                    <span className="text-[11px] text-[#405881]">Double-Entry Integrity</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#15803D] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Deterministic
                </span>
              </div>

              <div className="my-5">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-[#405881] mb-1">
                  Accounting Identity
                </div>
                <div className="text-2xl font-bold text-[#273869] font-mono tracking-tight">
                  Assets = L + E
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#405881]">
              <div className="flex justify-between">
                <span>Planning Materiality</span>
                <span className="font-mono tabular-nums text-[#273869] font-bold">5% Pre-Tax</span>
              </div>
              <div className="flex justify-between">
                <span>Tolerable Misstatement</span>
                <span className="font-mono tabular-nums text-[#273869] font-bold">50% PM</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: AI Engine Card */}
          <motion.div
            variants={cardHover}
            initial="rest"
            whileHover="hover"
            className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-md p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#EDF1F4] flex items-center justify-center text-[#273869]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#273869] block">Grounded AI Inquiry</span>
                    <span className="text-[11px] text-[#405881]">Google Gemini Engine</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#273869] bg-[#EDF1F4] px-2.5 py-0.5 rounded-full">
                  Live API
                </span>
              </div>

              <div className="my-5">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-[#405881] mb-1">
                  Decision Threshold
                </div>
                <div className="text-3xl font-bold text-[#273869] tabular-nums tracking-tight">
                  &ge; 0.85
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[rgba(64,88,129,0.08)] text-xs text-[#405881]">
              Metrics exceeding 85% confidence auto-approve into the pre-audit ledger.
            </div>
          </motion.div>
        </div>
      </section>

      {/* Real SEC Filers Registry from Database */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1F4] text-[#273869] text-xs font-semibold mb-2">
                <span>01</span>
                <span className="text-[#405881]">Real SEC EDGAR Filers</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#273869]">
                Benchmark Entities
              </h2>
              <p className="text-xs sm:text-sm text-[#405881]">
                Select any registered public company to run real-time SEC EDGAR pre-audit extraction.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/companies")}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Full Directory
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.slice(0, 5).map((c) => (
              <div
                key={c.ticker}
                onClick={() => navigate(`/workbench?ticker=${c.ticker}`)}
                className="group p-4 rounded-xl border border-[rgba(64,88,129,0.12)] bg-[#EDF1F4]/40 hover:bg-white hover:border-[#273869] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#273869] text-base group-hover:text-[#D94B1E] transition-colors">
                    {c.ticker}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white border border-[rgba(64,88,129,0.14)] text-[#405881]">
                    CIK {c.cik}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#273869] mb-1">{c.name}</div>
                <div className="text-[11px] text-[#405881] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Form 10-K Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
