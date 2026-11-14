import React, { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { Shield, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import { blurFadeIn } from "../lib/motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";

export const AccountSettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setStatus("error");
      setMessage("Please fill out all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New passwords do not match.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setStatus("error");
        setMessage(data.detail || "Unable to update password.");
      }
    } catch {
      setStatus("error");
      setMessage("Network connection error.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <motion.div
        variants={blurFadeIn}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#273869] text-xs font-semibold border border-[rgba(64,88,129,0.12)]">
          <span>05</span>
          <span className="text-[#405881]">Reviewer Account</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#273869]">
          Account & <span className="font-serif-accent font-normal text-4xl text-[#273869]">Security.</span>
        </h1>
        <p className="text-sm text-[#405881]">
          Manage your reviewer identity, cryptographic session tokens, and password credentials.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#273869] text-white flex items-center justify-center font-bold text-xl">
              {user?.full_name ? user.full_name[0] : "U"}
            </div>
            <div>
              <div className="font-bold text-[#273869] text-base">{user?.full_name || "Reviewer"}</div>
              <div className="text-xs text-[#405881]">{user?.email}</div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[rgba(64,88,129,0.1)] text-xs">
            <div className="flex justify-between items-center text-[#405881]">
              <span>Profile Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>
            <div className="flex justify-between items-center text-[#405881]">
              <span>Audit Role</span>
              <span className="font-semibold text-[#273869]">Lead Auditor / CPA</span>
            </div>
            <div className="flex justify-between items-center text-[#405881]">
              <span>Session Type</span>
              <span className="font-mono text-[11px] text-[#273869]">HttpOnly JWT</span>
            </div>
          </div>

          <Button
            variant="destructive"
            size="md"
            className="w-full mt-4"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            icon={<LogOut className="w-4 h-4" />}
          >
            Sign Out Session
          </Button>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[rgba(64,88,129,0.12)] shadow-soft-sm p-6 space-y-6">
          <div className="flex items-center gap-2 text-[#273869]">
            <Shield className="w-5 h-5 text-[#273869]" />
            <h2 className="font-bold text-lg">Change Security Password</h2>
          </div>

          {status === "error" && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{message}</span>
            </div>
          )}

          {status === "success" && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3.5 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#273869] mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 bg-[#EDF1F4]/50 border border-[rgba(64,88,129,0.16)] rounded-xl text-xs sm:text-sm text-[#273869] placeholder-[#94A3B8] focus:outline-none focus:border-[#273869] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={status === "loading"}
              >
                Save Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
