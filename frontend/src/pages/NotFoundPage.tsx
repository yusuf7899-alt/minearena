import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileQuestion } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-lg p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#EDF1F4] text-[#273869] mx-auto flex items-center justify-center">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-[#273869] tracking-tight">404 — Ledger Not Found</h1>
        <p className="text-xs text-[#405881] leading-relaxed">
          The requested audit path or filing record does not exist in the Moneta directory.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#273869] hover:bg-[#1C2A52] text-white rounded-xl text-xs font-semibold shadow-soft-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Overview</span>
        </Link>
      </div>
    </div>
  );
};

