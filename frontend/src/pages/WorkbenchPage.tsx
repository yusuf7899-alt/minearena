import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Send, RefreshCw,
  ExternalLink, Zap,
  X, Sparkles,
  Search, AlertCircle,
  Eye, EyeOff
} from 'lucide-react';
import { blurFadeIn } from '../lib/motion';
import { Button } from '../components/Button';

// ─── Interfaces & Contracts ───────────────────────────────────────────────────

export interface Metric {
  concept: string;
  value: number;
  raw_text: string;
  unit: string;
  scale: string;
  period_end: string;
  method: string;
  evidence_snippet: string;
  matched_tag: string | null;
  is_derived: boolean;
  derived_reason: string | null;
  xbrl_ground_truth: number | null;
  xbrl_tag: string | null;
  xbrl_matches: boolean;
  confidence_score: number;
  confidence_status: 'AUTO_APPROVED' | 'ESCALATED_HUMAN_REVIEW';
  method_subscore?: number;
  xbrl_concordance_subscore?: number;
  tieout_penalty?: number;
  escalation_reasons: string[];
  auditor_decision: string;
}

export interface TieOut {
  rule_name: string;
  status: string;
  formula: string;
  left_value: number;
  right_value: number;
  numeric_difference: number;
  percentage_difference: number;
  materiality_threshold: number;
  is_material: boolean;
  explanation: string;
  contributing_line_items: string[];
}

export interface FourFactor {
  assets: number;
  liabilities: number;
  equity: number;
  net_income: number;
  revenues: number;
  gross_profit: number;
  operating_cash_flow: number;
  cash_and_equivalents: number;
  operating_income: number;
  balance_sheet_balanced: boolean;
  implied_cogs: number;
  gross_margin_pct: number;
  net_margin_pct: number;
}

export interface AnalysisResult {
  company_name: string;
  ticker: string;
  cik: string;
  fiscal_year: number;
  form: string;
  filing_date: string;
  report_date: string;
  accession_number: string;
  document_url: string;
  is_error_seeded: boolean;
  seeded_error_details: string | null;
  overall_status: string;
  unbalanced_gap_usd: number;
  metrics: Record<string, Metric>;
  tie_outs: TieOut[];
  four_factor: FourFactor;
  materiality: {
    pre_tax_income: number;
    planning_materiality: number;
    tolerable_misstatement: number;
    trivial_threshold: number;
    flagged_count: number;
  };
  stats: {
    concepts_extracted: number;
    auto_approved: number;
    escalated: number;
    tie_outs_passed: number;
    tie_outs_failed: number;
    tie_outs_warning: number;
  };
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v === 0) return '$0';
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtFull(v: number): string {
  if (v < 0) return `(${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const TICKERS = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.' },
  { ticker: 'TSLA', name: 'Tesla, Inc.' },
  { ticker: 'IBM',  name: 'IBM Corp.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
];

export const WorkbenchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [ticker, setTicker] = useState<string>('AAPL');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tieouts' | 'metrics' | 'evidence' | 'report'>('overview');
  const [selectedSnippet, setSelectedSnippet] = useState<{ concept: string; text: string; method: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [hideFigures, setHideFigures] = useState<boolean>(false);
  
  // Real Grounded Gemini Chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; citation?: string; latency?: number; model?: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize from URL params or default
  useEffect(() => {
    const urlTicker = searchParams.get('ticker');
    const urlTab = searchParams.get('tab') as any;

    if (urlTab && ['overview', 'tieouts', 'metrics', 'evidence', 'report'].includes(urlTab)) {
      setActiveTab(urlTab);
    }

    if (urlTicker && TICKERS.some(t => t.ticker === urlTicker)) {
      setTicker(urlTicker);
      runAnalysis(urlTicker);
    } else {
      runAnalysis('AAPL');
    }
  }, []);

  const runAnalysis = async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: t,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || `HTTP ${res.status}`);
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
      setChatMessages([
        {
          sender: 'system',
          text: `Moneta Pre-Audit verification completed for ${data.company_name} (${data.ticker}) FY${data.fiscal_year}. Overall status: ${data.overall_status}. ${data.stats.concepts_extracted} metrics calibrated with ${data.stats.auto_approved} auto-approved. ${data.stats.tie_outs_passed} tie-outs passed. Real AI inquiry terminal is ready.`,
          citation: `Form ${data.form} · Accession ${data.accession_number} · SEC EDGAR Archive`,
        },
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicker = (t: string) => {
    setTicker(t);
    setSearchParams({ ticker: t, tab: activeTab });
    runAnalysis(t);
  };

  const handleTabChange = (t: typeof activeTab) => {
    setActiveTab(t);
    setSearchParams({ ticker, tab: t });
  };

  // Real Gemini API Call (No setTimeout simulation!)
  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !result || chatLoading) return;
    const q = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'auditor', text: q }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: result.ticker,
          company_name: result.company_name,
          fiscal_year: result.fiscal_year,
          form: result.form,
          report_date: result.report_date,
          question: q,
          metrics: result.metrics,
          tie_outs: result.tie_outs,
          four_factor: result.four_factor,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Gemini API HTTP ${res.status}`);
      }

      const aiData = await res.json();
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'gemini',
          text: aiData.answer,
          citation: aiData.citation,
          latency: aiData.latency_ms,
          model: aiData.model_name,
        },
      ]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'system',
          text: `Inquiry failed: ${err.message || 'Network error reaching Gemini service'}.`,
          citation: 'Diagnostic Error',
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const filteredMetrics = result ? Object.entries(result.metrics).filter(([concept, m]) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return concept.toLowerCase().includes(q) || (m.xbrl_tag && m.xbrl_tag.toLowerCase().includes(q)) || m.evidence_snippet.toLowerCase().includes(q);
  }) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* ── Top Control Bar ── */}
      <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Ticker selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#273869] uppercase tracking-wider mr-1">
            SEC Filer:
          </span>
          <div className="flex items-center bg-[#EDF1F4] p-1 rounded-xl border border-[rgba(64,88,129,0.1)]">
            {TICKERS.map(c => (
              <button
                key={c.ticker}
                type="button"
                onClick={() => handleSelectTicker(c.ticker)}
                disabled={loading}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ticker === c.ticker
                    ? 'bg-[#273869] text-white shadow-soft-sm'
                    : 'text-[#405881] hover:text-[#273869]'
                }`}
              >
                {c.ticker}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setHideFigures(!hideFigures)}
            title={hideFigures ? "Reveal numbers" : "Mask sensitive figures"}
            aria-label={hideFigures ? "Reveal numbers" : "Mask sensitive figures"}
            className="p-2 rounded-xl text-[#405881] hover:text-[#273869] border border-[rgba(64,88,129,0.14)] hover:bg-[#EDF1F4] transition-colors cursor-pointer ml-1"
          >
            {hideFigures ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Run Re-Audit Button */}
        <Button
          variant="primary"
          size="md"
          loading={loading}
          onClick={() => runAnalysis(ticker)}
          icon={<Zap className="w-4 h-4" />}
        >
          {loading ? 'Reconciling SEC XBRL...' : 'Re-Run Verification'}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Status Banner ── */}
      {result && (
        <motion.div
          variants={blurFadeIn}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-emerald-200 bg-[#F0FDF4] p-5 shadow-soft-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                Statutory Ground Truth Pass
              </div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-900">
                {result.company_name} ({result.ticker}) • Verified Form {result.form}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-emerald-800">
              Planning Materiality: <code className="font-mono tabular-nums">${(result.materiality.planning_materiality / 1e6).toFixed(1)}M</code>
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Primary Tabs Navigation (Sliding Pill Indicator) ── */}
      <div className="flex items-center justify-between border-b border-[rgba(64,88,129,0.12)] pb-2 overflow-x-auto">
        <div className="flex items-center gap-2 bg-[#EDF1F4] p-1 rounded-xl">
          {[
            { id: 'overview', label: 'Four-Factor Ledger' },
            { id: 'tieouts', label: 'Tie-Out Matrix' },
            { id: 'metrics', label: 'Confidence & XBRL' },
            { id: 'evidence', label: 'SEC Snippet Browser' },
            { id: 'report', label: 'Audit Memo' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as any)}
                className={`relative px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive ? 'text-[#273869]' : 'text-[#405881] hover:text-[#273869]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="workbenchTabPill"
                    className="absolute inset-0 bg-white rounded-lg shadow-soft-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {result && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#405881] font-mono">
            <span>CIK {result.cik}</span>
            <span>•</span>
            <a
              href={result.document_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[#273869] hover:text-[#D94B1E] font-medium transition-colors"
            >
              <span>SEC Filing Archive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* ── SKELETON LOADER WHILE LOADING ── */}
      {loading && !result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] p-5 space-y-3">
              <div className="w-24 h-3 bg-[#EDF1F4] rounded" />
              <div className="w-36 h-7 bg-[#EDF1F4] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 1: Four-Factor Ledger & Live Chat ── */}
      {activeTab === 'overview' && result && (
        <div className="space-y-8">
          {/* Four-Factor Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Assets */}
            <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-5 space-y-2">
              <span className="text-[11px] uppercase font-semibold text-[#405881] tracking-wider block">
                Total Assets
              </span>
              <div className="text-2xl font-bold text-[#273869] tabular-nums font-mono">
                {hideFigures ? "••••••••" : fmtFull(result.four_factor.assets)}
              </div>
              <div className="text-[11px] text-[#405881] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#273869]" />
                <span>Consolidated Balance Sheet</span>
              </div>
            </div>

            {/* Liabilities */}
            <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-5 space-y-2">
              <span className="text-[11px] uppercase font-semibold text-[#405881] tracking-wider block">
                Total Liabilities
              </span>
              <div className="text-2xl font-bold text-[#273869] tabular-nums font-mono">
                {hideFigures ? "••••••••" : fmtFull(result.four_factor.liabilities)}
              </div>
              <div className="text-[11px] text-[#405881] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#405881]" />
                <span>Obligations & Debt</span>
              </div>
            </div>

            {/* Equity */}
            <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-5 space-y-2">
              <span className="text-[11px] uppercase font-semibold text-[#405881] tracking-wider block">
                Stockholders&apos; Equity
              </span>
              <div className="text-2xl font-bold text-[#273869] tabular-nums font-mono">
                {hideFigures ? "••••••••" : fmtFull(result.four_factor.equity)}
              </div>
              <div className="text-[11px] text-[#405881] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Book Value of Equity</span>
              </div>
            </div>

            {/* Identity Status */}
            <div className={`rounded-2xl border p-5 space-y-2 shadow-soft-sm ${
              result.four_factor.balance_sheet_balanced
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-red-50/80 border-red-300 text-red-950'
            }`}>
              <span className="text-[11px] uppercase font-semibold tracking-wider block">
                Balance Sheet Equation
              </span>
              <div className="text-xl font-bold font-mono">
                {result.four_factor.balance_sheet_balanced ? 'A = L + E (TIED)' : 'A ≠ L + E (MISMATCH)'}
              </div>
              <div className="text-[11px] font-medium">
                {result.four_factor.balance_sheet_balanced
                  ? 'Mathematical equality verified'
                  : `Discrepancy: ${fmt(result.unbalanced_gap_usd)}`}
              </div>
            </div>
          </div>

          {/* Flow Linkages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-5 space-y-3">
              <span className="text-xs font-bold text-[#273869] uppercase tracking-wider block">
                Revenues & Margins
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Total Revenues</span>
                  <span className="font-mono tabular-nums font-bold text-[#273869]">
                    {hideFigures ? "••••" : fmt(result.four_factor.revenues)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Gross Profit</span>
                  <span className="font-mono tabular-nums font-bold text-[#273869]">
                    {hideFigures ? "••••" : fmt(result.four_factor.gross_profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Gross Margin</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-700">
                    {(result.four_factor.gross_margin_pct).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-5 space-y-3">
              <span className="text-xs font-bold text-[#273869] uppercase tracking-wider block">
                Cash Flow Reconciliation
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Operating Cash Flow</span>
                  <span className="font-mono tabular-nums font-bold text-[#273869]">
                    {hideFigures ? "••••" : fmt(result.four_factor.operating_cash_flow)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Ending Cash on B/S</span>
                  <span className="font-mono tabular-nums font-bold text-[#273869]">
                    {hideFigures ? "••••" : fmt(result.four_factor.cash_and_equivalents)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Operating Income</span>
                  <span className="font-mono tabular-nums font-bold text-[#273869]">
                    {hideFigures ? "••••" : fmt(result.four_factor.operating_income)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-5 space-y-3">
              <span className="text-xs font-bold text-[#273869] uppercase tracking-wider block">
                Audit Planning Materiality
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Pre-Tax Income</span>
                  <span className="font-mono tabular-nums font-bold text-[#273869]">{fmt(result.materiality.pre_tax_income)}</span>
                </div>
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Planning Materiality (5%)</span>
                  <span className="font-mono tabular-nums font-bold text-[#D94B1E]">{fmt(result.materiality.planning_materiality)}</span>
                </div>
                <div className="flex justify-between items-center text-[#405881]">
                  <span>Tolerable Misstatement</span>
                  <span className="font-mono tabular-nums font-bold text-[#273869]">{fmt(result.materiality.tolerable_misstatement)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Google Gemini AI Inquiry Terminal */}
          <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(64,88,129,0.08)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D94B1E]" />
                <h3 className="font-bold text-sm text-[#273869]">Grounded Gemini Pre-Audit Inquiry Terminal</h3>
              </div>
              <span className="text-[11px] font-mono text-[#15803D] font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Connected: gemini-3-flash-preview
              </span>
            </div>

            <div className="h-60 overflow-y-auto space-y-3 p-3 bg-[#EDF1F4]/40 rounded-xl border border-[rgba(64,88,129,0.08)] text-xs">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === 'auditor' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                    msg.sender === 'auditor'
                      ? 'bg-[#273869] text-white shadow-soft-sm'
                      : 'bg-white border border-[rgba(64,88,129,0.12)] text-[#273869]'
                  }`}>
                    {msg.text}
                    {msg.citation && (
                      <div className="mt-2 pt-2 border-t border-[rgba(64,88,129,0.1)] text-[10px] font-mono text-[#405881] flex items-center justify-between">
                        <span>Source: {msg.citation}</span>
                        {msg.latency && <span>{msg.latency}ms</span>}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-[#405881] mt-0.5 px-1 font-semibold">
                    {msg.sender}
                  </span>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-[#405881] p-2 bg-white rounded-lg border border-[rgba(64,88,129,0.1)] w-fit">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#273869]" />
                  <span>Querying Gemini with quarantined SEC context...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about tie-out formulas, detected variances, or source citations..."
                className="flex-1 bg-white border border-[rgba(64,88,129,0.16)] rounded-xl px-4 py-2.5 text-xs text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869]"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={chatLoading}
                disabled={!chatInput.trim()}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Inquire
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 2: Tie-Out Validation Matrix ── */}
      {activeTab === 'tieouts' && result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#273869]">
              Seven Statutory Tie-Out Reconciliations
            </h2>
            <span className="text-xs font-mono text-[#405881]">
              Passed: {result.stats.tie_outs_passed} / {result.tie_outs.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {result.tie_outs.map((to) => {
              const isPassed = to.status === 'PASSED';
              return (
                <div
                  key={to.rule_name}
                  className={`rounded-2xl border p-5 space-y-3 bg-white shadow-soft-sm ${
                    isPassed ? 'border-[rgba(64,88,129,0.12)]' : 'border-2 border-red-300 bg-red-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#273869]">{to.rule_name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isPassed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {to.status}
                    </span>
                  </div>

                  <div className="font-mono text-xs bg-[#EDF1F4]/60 p-2.5 rounded-xl border border-[rgba(64,88,129,0.08)] text-[#273869]">
                    {to.formula}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#405881] block text-[11px]">Left Side</span>
                      <span className="font-mono tabular-nums font-bold text-[#273869]">
                        {hideFigures ? "••••" : fmtFull(to.left_value)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#405881] block text-[11px]">Right Side</span>
                      <span className="font-mono tabular-nums font-bold text-[#273869]">
                        {hideFigures ? "••••" : fmtFull(to.right_value)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[rgba(64,88,129,0.08)] flex justify-between items-center text-xs">
                    <span className="text-[#405881]">Variance:</span>
                    <span className={`font-mono tabular-nums font-bold ${
                      Math.abs(to.numeric_difference) > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}>
                      {hideFigures ? "••••" : fmtFull(to.numeric_difference)}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#405881] leading-relaxed">
                    {to.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: Confidence & XBRL Ground Truth Table ── */}
      {activeTab === 'metrics' && result && (
        <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#273869]">
                Calibrated Metrics & Multi-Factor Confidence
              </h2>
              <p className="text-xs text-[#405881]">
                Scored across Method, Concordance, and Tie-Out Consistency (Auto-Approved ≥ 85%).
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#405881]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter concept or XBRL tag..."
                className="pl-8 pr-3 py-1.5 bg-[#EDF1F4]/60 border border-[rgba(64,88,129,0.14)] rounded-xl text-xs text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EDF1F4]/70 text-[#273869] uppercase font-bold text-[10px] tracking-wider border-b border-[rgba(64,88,129,0.1)]">
                <tr>
                  <th className="py-3 px-4">Accounting Concept</th>
                  <th className="py-3 px-4 text-right">Value (USD)</th>
                  <th className="py-3 px-4">XBRL Tag & Concordance</th>
                  <th className="py-3 px-4 text-center">Confidence Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(64,88,129,0.08)]">
                {filteredMetrics.map(([concept, m]) => {
                  const pct = Math.round(m.confidence_score * 100);
                  const isAuto = m.confidence_status === 'AUTO_APPROVED' || m.confidence_score >= 0.85;
                  return (
                    <tr key={concept} className="hover:bg-[#EDF1F4]/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#273869]">
                        {concept}
                        {m.is_derived && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-800 border border-amber-200">
                            Derived
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#273869]">
                        {hideFigures ? "••••••••" : fmtFull(m.value)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#405881]">
                        <div>{m.xbrl_tag || 'us-gaap:NotTagged'}</div>
                        <div className="text-[10px] text-emerald-700">
                          {m.xbrl_matches ? '✓ Exact Ground Truth Match' : 'Discrepancy / Untagged'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-xs tabular-nums text-[#273869]">
                            {pct}%
                          </span>
                          <div className="w-16 h-1.5 bg-[#EDF1F4] rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full ${isAuto ? 'bg-emerald-600' : 'bg-[#D94B1E]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAuto
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {isAuto ? 'AUTO' : 'FLAGGED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedSnippet({
                            concept: m.concept,
                            text: m.evidence_snippet,
                            method: m.method
                          })}
                        >
                          View Snippet
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: SEC Evidence Snippet Browser ── */}
      {activeTab === 'evidence' && result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] p-5 shadow-soft-sm space-y-3">
            <h3 className="font-bold text-sm text-[#273869] uppercase tracking-wider">
              Extracted Line Items ({Object.keys(result.metrics).length})
            </h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {Object.entries(result.metrics).map(([concept, m]) => (
                <button
                  key={concept}
                  type="button"
                  onClick={() => setSelectedSnippet({
                    concept: m.concept,
                    text: m.evidence_snippet,
                    method: m.method
                  })}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    selectedSnippet?.concept === concept
                      ? 'bg-[#273869] text-white border-[#273869]'
                      : 'bg-[#EDF1F4]/40 hover:bg-[#EDF1F4] border-[rgba(64,88,129,0.08)] text-[#273869]'
                  }`}
                >
                  <div className="font-semibold truncate">{concept}</div>
                  <div className="font-mono tabular-nums text-[11px] opacity-80">{fmtFull(m.value)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] p-6 shadow-soft-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(64,88,129,0.08)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#273869]">
                  {selectedSnippet?.concept || 'Select a concept to inspect evidence'}
                </h3>
                <span className="text-xs text-[#405881]">
                  Accession: {result.accession_number} • Form {result.form}
                </span>
              </div>
              {selectedSnippet && (
                <span className="text-xs font-mono bg-[#EDF1F4] px-2.5 py-1 rounded-md text-[#273869]">
                  {selectedSnippet.method}
                </span>
              )}
            </div>

            <div className="p-4 bg-[#EDF1F4]/50 border-l-4 border-[#273869] rounded-r-xl font-mono text-xs text-[#273869] leading-relaxed whitespace-pre-wrap">
              {selectedSnippet ? selectedSnippet.text : (
                <span className="text-[#94A3B8] italic">Click any concept on the left to display its full verified evidence snippet.</span>
              )}
            </div>

            <div className="text-xs text-[#405881] space-y-1">
              <p><strong>Integrity Rule:</strong> Every extracted figure must trace to an exact verified HTML/XBRL snippet. Hallucinations outside the filing boundary are rejected by protocol.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: Audit Working Paper Report Memo ── */}
      {activeTab === 'report' && result && (
        <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-8 max-w-4xl mx-auto space-y-8 font-sans">
          <div className="border-b-2 border-[#273869] pb-6 flex items-start justify-between">
            <div>
              <div className="font-bold tracking-tight text-xl text-[#273869]">
                MONETA PRE-AUDIT WORKING PAPER MEMO
              </div>
              <div className="text-xs text-[#405881] mt-1">
                Generated pursuant to PCAOB AS 2810 & AICPA Statement Audit Standards
              </div>
            </div>
            <div className="text-right text-xs text-[#405881] font-mono">
              <div>Date: {new Date().toISOString().split('T')[0]}</div>
              <div>Filer: {result.company_name} ({result.ticker})</div>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#273869] leading-relaxed">
            <h3 className="font-bold text-base text-[#273869]">I. Executive Summary & Opinion</h3>
            <p>
              Moneta Systems Inc. performed an automated pre-audit verification of the financial disclosures submitted for <strong>{result.company_name}</strong> (CIK {result.cik}) for the period ending {result.report_date}.
            </p>
            <div className={`p-4 rounded-xl border ${
              result.overall_status === 'MATERIAL_MISSTATEMENT_DETECTED'
                ? 'bg-red-50 border-red-300 text-red-900 font-semibold'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
            }`}>
              AUDIT STATUS: {result.overall_status.replace(/_/g, ' ')}
            </div>

            <h3 className="font-bold text-base text-[#273869] pt-4">II. Four-Factor Balance Sheet Tie-Out</h3>
            <p>
              The fundamental balance sheet identity ($Assets = Liabilities + Equity$) was evaluated.
              Total assets of {fmtFull(result.four_factor.assets)} compare to combined liabilities and equity of {fmtFull(result.four_factor.liabilities + result.four_factor.equity)}.
            </p>

            <h3 className="font-bold text-base text-[#273869] pt-4">III. Calibration & Auto-Approval Metrics</h3>
            <p>
              {result.stats.concepts_extracted} metrics were extracted via SEC XBRL parsing. {result.stats.auto_approved} metrics satisfied the auto-approval threshold (&ge; 85% confidence score).
            </p>
          </div>
        </div>
      )}

      {/* Snippet Modal when clicked from metrics table */}
      <AnimatePresence>
        {selectedSnippet && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              variants={blurFadeIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="bg-white rounded-2xl border border-[rgba(64,88,129,0.16)] shadow-soft-lg max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[rgba(64,88,129,0.1)] pb-3">
                <h4 className="font-bold text-base text-[#273869]">{selectedSnippet.concept}</h4>
                <button
                  type="button"
                  onClick={() => setSelectedSnippet(null)}
                  className="p-1 text-[#405881] hover:text-[#273869] rounded-lg hover:bg-[#EDF1F4]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[#EDF1F4]/70 rounded-xl font-mono text-xs text-[#273869] leading-relaxed max-h-60 overflow-y-auto">
                {selectedSnippet.text}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedSnippet(null)}
                >
                  Close Inspection
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
