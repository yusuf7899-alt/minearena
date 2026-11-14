import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { blurFadeIn } from "../lib/motion";
import { Button } from "../components/Button";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/workbench";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || "Invalid credentials.");
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
          <span>01</span>
          <span className="text-[#405881]">Security & Access</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#273869] mb-2">
          Reviewer <span className="font-serif-accent font-normal text-3xl sm:text-4xl text-[#273869]">Sign In.</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#405881] mb-6">
          Access the institutional audit workbench and verified SEC XBRL ledger.
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#273869] uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#D94B1E] hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Enter Workbench
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-[rgba(64,88,129,0.1)] text-center text-xs text-[#405881]">
          Need an audit reviewer credential?{" "}
          <Link to="/signup" className="text-[#273869] font-semibold hover:underline">
            Register Account
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

