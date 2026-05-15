"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    return (
      <label
        className={cn(
          "peer inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-primary shadow focus-within:outline-none focus-within:ring-1 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          props.checked && "bg-primary text-primary-foreground",
          className
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        {props.checked && <Check className="h-3 w-3" />}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
