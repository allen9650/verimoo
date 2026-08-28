import clsx from "clsx";
import React from "react";
import { motion } from "framer-motion";

export function Button({
  className,
  variant = "primary",
  loading = false,
  children,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof motion.button>, "children"> & {
  children?: React.ReactNode;
  variant?: "primary" | "gradient" | "secondary" | "outline" | "danger" | "ghost";
  loading?: boolean;
}) {
  const map = {
    primary: "btn-primary",
    gradient: "btn-gradient",
    secondary: "btn-secondary",
    outline: "btn-outline",
    danger: "btn-danger",
    ghost: "btn-ghost",
  };

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.015 }}
      whileTap={disabled || loading ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.1 }}
      disabled={disabled || loading}
      className={clsx(map[variant], className)}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </motion.button>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("input", className)} />;
}

export function Card({
  className,
  hover = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={clsx("card p-5 sm:p-6", hover && "card-hover", className)} {...props} />;
}

export function Badge({
  children,
  color = "gray",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  dot?: boolean;
  className?: string;
}) {
  const colors: Record<string, { bg: string; dot: string }> = {
    gray: {
      bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
      dot: "bg-slate-400",
    },
    green: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
      dot: "bg-[#10B981]",
    },
    yellow: {
      bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
      dot: "bg-[#F59E0B]",
    },
    red: {
      bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
      dot: "bg-[#EF4444]",
    },
    blue: {
      bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60",
      dot: "bg-[#3B82F6]",
    },
    indigo: {
      bg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60",
      dot: "bg-[#4F46E5]",
    },
    purple: {
      bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60",
      dot: "bg-[#7C3AED]",
    },
    slate: {
      bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      dot: "bg-[#64748B]",
    },
  };

  const scheme = colors[color] || colors.gray;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
        scheme.bg,
        className
      )}
    >
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full", scheme.dot)} />}
      {children}
    </span>
  );
}
