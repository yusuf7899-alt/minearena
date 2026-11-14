import React, { useState } from "react";
import { motion } from "motion/react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { blurFadeIn } from "../lib/motion";
import { Button } from "../components/Button";

interface UploadedMetric {
  concept: string;
  value: number;
  raw_text: string;
  unit: string;
  scale: string;
  period_end: string;
  evidence_snippet: string;
  is_derived?: boolean;
}

interface UploadResponse {
  statement_type: string;
  company_ticker: string;
  period_end: string;
  currency: string;
  scale: string;
  source_file: string;
  metrics: Record<string, UploadedMetric>;
}

export const UploadStatementPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a valid CSV or PDF financial statement.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/audit/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Upload failed with HTTP ${res.status}`);
      }

      const data: UploadResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Unable to parse submitted financial statement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div variants={blurFadeIn} initial="hidden" animate="visible" className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[rgba(64,88,129,0.12)] text-xs font-semibold text-[#273869] shadow-soft-sm">
          <UploadCloud className="w-3.5 h-3.5 text-[#273869]" />
          <span>Statement Ingestion Engine</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#273869]">
          Upload <span className="font-serif-accent font-normal text-4xl text-[#273869]">Financial Statement.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#405881]">
          Submit a genuine corporate balance sheet or income statement (CSV or PDF) for deterministic parsing and four-factor verification.
        </p>
      </motion.div>

      {/* Upload Dropzone Form */}
      <div className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] p-6 sm:p-8 shadow-soft-sm space-y-6">
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-[rgba(64,88,129,0.2)] hover:border-[#273869] rounded-2xl p-8 text-center transition-colors">
            <input
              type="file"
              id="statement-file"
              accept=".csv,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="statement-file"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-[#EDF1F4] flex items-center justify-center text-[#273869]">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[#273869]">
                {file ? file.name : "Click to select CSV or PDF statement file"}
              </div>
              <p className="text-[11px] text-[#405881]">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB selected`
                  : "Supports multi-column balance sheets with accounting parentheses (1,234.56)"}
              </p>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#405881]">
              Zero LLM training: statement contents are quarantined in memory.
            </span>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!file}
              icon={<UploadCloud className="w-4 h-4" />}
            >
              Parse Statement
            </Button>
          </div>
        </form>
      </div>

      {/* Uploaded Result View */}
      {result && (
        <motion.div
          variants={blurFadeIn}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] p-6 shadow-soft-sm space-y-6"
        >
          <div className="flex items-center justify-between border-b border-[rgba(64,88,129,0.08)] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Parsed Successfully
              </div>
              <h2 className="text-xl font-bold text-[#273869]">
                Statement: {result.source_file}
              </h2>
            </div>
            <div className="text-right text-xs font-mono text-[#405881]">
              <div>Scale: {result.scale}</div>
              <div>Period: {result.period_end || "N/A"}</div>
            </div>
          </div>

          {/* Parsed Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EDF1F4]/70 text-[#273869] uppercase font-bold text-[10px] tracking-wider border-b border-[rgba(64,88,129,0.1)]">
                <tr>
                  <th className="py-2.5 px-4">Concept</th>
                  <th className="py-2.5 px-4 text-right">Parsed Value (USD)</th>
                  <th className="py-2.5 px-4">Raw Text Excerpt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(64,88,129,0.08)]">
                {Object.entries(result.metrics).map(([concept, m]) => (
                  <tr key={concept} className="hover:bg-[#EDF1F4]/30">
                    <td className="py-2.5 px-4 font-semibold text-[#273869]">{concept}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-[#273869]">
                      ${m.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#405881]">
                      {m.evidence_snippet}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty State when no file chosen */}
      {!file && !result && (
        <div className="p-8 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.1)] rounded-2xl text-center space-y-2">
          <p className="text-xs text-[#405881]">
            No uploaded statement yet. Select an authentic filing CSV or PDF to begin.
          </p>
        </div>
      )}
    </div>
  );
};
