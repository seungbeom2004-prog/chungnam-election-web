"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg border border-border bg-surface px-3 py-2
            text-sm text-foreground placeholder:text-muted
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-colors duration-150
            disabled:opacity-50 disabled:bg-background
            ${error ? "border-red-500 focus:ring-red-500/50" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full rounded-lg border border-border bg-surface px-3 py-2
            text-sm text-foreground placeholder:text-muted
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            transition-colors duration-150 resize-vertical min-h-[80px]
            disabled:opacity-50 disabled:bg-background
            ${error ? "border-red-500 focus:ring-red-500/50" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
