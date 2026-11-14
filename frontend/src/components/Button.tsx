import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "icon";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      disabled,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Base: 12px radius, strict typography, smooth cubic transition, visible accessibility focus ring
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]";

    const sizeStyles = {
      sm: variant === "icon" ? "p-1.5" : "px-3 py-1.5 text-xs gap-1.5",
      md: variant === "icon" ? "p-2.5" : "px-4 py-2 text-xs sm:text-sm gap-2",
      lg: variant === "icon" ? "p-3.5" : "px-6 py-3 text-sm gap-2.5",
    }[size];

    const variantStyles = {
      primary:
        "bg-[#D94B1E] text-white hover:bg-[#C53F15] focus-visible:ring-[#D94B1E] shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5",
      secondary:
        "bg-white text-[#273869] border border-[rgba(64,88,129,0.2)] hover:border-[#273869] hover:bg-[#F8FAFC] focus-visible:ring-[#273869] shadow-soft-sm",
      ghost:
        "bg-transparent text-[#405881] hover:text-[#273869] hover:bg-[#EDF1F4]/70 focus-visible:ring-[#273869]",
      destructive:
        "bg-red-50 text-[#B91C1C] border border-red-200 hover:bg-red-100 hover:text-red-900 focus-visible:ring-[#B91C1C]",
      icon:
        "bg-white text-[#405881] hover:text-[#273869] border border-[rgba(64,88,129,0.14)] hover:bg-[#EDF1F4]/50 focus-visible:ring-[#273869] shadow-soft-sm",
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

