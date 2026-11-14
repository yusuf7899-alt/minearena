import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { blurFadeIn } from "../lib/motion";
import { Button } from "../components/Button";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Reset token generated successfully.");
        if (data.token) {
          setResetToken(data.token);
        }
      } else {
        setStatus("error");
        setMessage(data.detail || "Unable to process password reset request.");
      }
    } catch {
      setStatus("error");
      setMessage("Network connection error.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        variants={blurFadeIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-lg p-6 sm:p-8"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1F4] text-[#273869] text-xs font-semibold mb-6">
          <span>03</span>
          <span className="text-[#405881]">Credential Recovery</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#273869] mb-2">
          Reset <span className="font-serif-accent font-normal text-3xl sm:text-4xl text-[#273869]">Password.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#405881] mb-6">
          Enter your registered institutional email to issue a secure password reset link.
        </p>

        {status === "error" && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{message}</span>
          </div>
        )}

        {status === "success" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reset Authorization Dispatched</span>
              </div>
              <p className="leading-relaxed">
                If the email matches an active profile, reset instructions have been recorded.
              </p>
              {resetToken && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 font-mono text-[11px] bg-white p-2.5 rounded-lg border">
                  <div className="text-[#405881] mb-1 font-sans font-semibold">Direct Reset Token:</div>
                  <code className="text-[#273869] select-all break-all">{resetToken}</code>
                </div>
              )}
            </div>
            <Link
              to={resetToken ? `/reset-password?token=${resetToken}` : "/login"}
              className="w-full py-3 px-4 bg-[#D94B1E] hover:bg-[#C53F15] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>{resetToken ? "Apply New Password" : "Back to Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#405881]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="auditor@moneta-audit.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={status === "loading"}
              className="w-full"
            >
              Send Reset Token
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-[rgba(64,88,129,0.1)] text-center text-xs text-[#405881]">
          Remember your password?{" "}
          <Link to="/login" className="text-[#273869] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

