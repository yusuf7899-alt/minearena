import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { blurFadeIn } from "../lib/motion";
import { Button } from "../components/Button";

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !fullName) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);
    const result = await signup(email, password, fullName);
    setLoading(false);

    if (result.success) {
      navigate("/workbench");
    } else {
      setError(result.error || "Unable to register account.");
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
        {/* Section Chip */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF1F4] text-[#273869] text-xs font-semibold mb-6">
          <span>02</span>
          <span className="text-[#405881]">Reviewer Provisioning</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#273869] mb-2">
          Create <span className="font-serif-accent font-normal text-3xl sm:text-4xl text-[#273869]">Reviewer Profile.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#405881] mb-6">
          Register with your institutional domain to begin automated pre-audit verification.
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
              Full Name & Title
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#405881]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Eleanor Vance, CPA"
                className="w-full pl-9 pr-4 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
              />
            </div>
          </div>

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
                placeholder="e.vance@moneta-audit.com"
                className="w-full pl-9 pr-4 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
              Password (Min 8 Characters)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#405881]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] text-[#405881] py-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Full compliance with SOC2 Type II and SEC access guidelines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Session tokens secured via HttpOnly encrypted transport</span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Complete Registration
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-[rgba(64,88,129,0.1)] text-center text-xs text-[#405881]">
          Already have reviewer access?{" "}
          <Link to="/login" className="text-[#273869] font-semibold hover:underline">
            Sign In Here
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

