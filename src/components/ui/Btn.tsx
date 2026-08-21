"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-white text-ink border border-[#CFCCCA] hover:bg-page",
  danger: "bg-danger text-white hover:bg-danger-deep",
  ghost: "bg-transparent text-primary-hover hover:text-primary",
};

export function Btn({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  ...rest
}: {
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeCls = size === "sm" ? "px-3.5 py-1.5 text-[12.5px]" : "px-4 py-2 text-[12.5px]";
  return (
    <button
      type="button"
      className={`rounded-ctl inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASS[variant]} ${sizeCls} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
