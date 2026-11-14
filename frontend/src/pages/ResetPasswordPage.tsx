import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { blurFadeIn } from "../lib/motion";
import { Button } from "../components/Button";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) {
      setStatus("error");
      setMessage("Please enter both the reset token and new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Password confirmation does not match.");
      return;
    }

    if (newPassword.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Password successfully updated.");
      } else {
        setStatus("error");
        setMessage(data.detail || "Unable to reset password.");
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
          <span>04</span>
          <span className="text-[#405881]">Credential Update</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#273869] mb-2">
          New <span className="font-serif-accent font-normal text-3xl sm:text-4xl text-[#273869]">Password.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#405881] mb-6">
          Submit your single-use reset token and configure your new login password.
        </p>

        {status === "error" && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{message}</span>
          </div>
        )}

        {status === "success" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password updated successfully. You may now access the workbench.</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate("/login")}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Moneta
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
                Reset Token
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#405881]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token here"
                  className="w-full pl-9 pr-4 py-2.5 font-mono bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#405881]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#405881]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
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
              Update Password
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
