"use client";

import { clsx } from "@/lib/clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={clsx(
        "rounded-full bg-pink px-6 py-3 font-display text-lg font-bold text-white shadow-[0_6px_0_var(--pink-dark)] transition active:translate-y-1 active:shadow-[0_2px_0_var(--pink-dark)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_var(--pink-dark)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={clsx(
        "rounded-full border-2 border-pink/40 bg-white/70 px-5 py-2 font-semibold text-pink-dark transition hover:bg-white hover:border-pink disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-3xl border-2 border-white bg-white/70 p-5 shadow-lg shadow-pink/10 backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
