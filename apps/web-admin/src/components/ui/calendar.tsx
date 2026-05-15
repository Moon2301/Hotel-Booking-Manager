"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.HTMLAttributes<HTMLDivElement> & {
  month?: Date;
  onMonthChange?: (month: Date) => void;
  selected?: Date | Date[];
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  modifiers?: Record<string, (date: Date) => boolean>;
  modifiersClassNames?: Record<string, string>;
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function Calendar({
  className,
  month: controlledMonth,
  onMonthChange,
  selected,
  onSelect,
  disabled,
  modifiers,
  modifiersClassNames,
  ...props
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(new Date());
  const currentMonth = controlledMonth ?? internalMonth;

  const handleMonthChange = (newMonth: Date) => {
    if (onMonthChange) {
      onMonthChange(newMonth);
    } else {
      setInternalMonth(newMonth);
    }
  };

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDay = getFirstDayOfMonth(year, monthIndex);

  const prevMonth = () => {
    handleMonthChange(new Date(year, monthIndex - 1, 1));
  };

  const nextMonth = () => {
    handleMonthChange(new Date(year, monthIndex + 1, 1));
  };

  const isSelected = (date: Date): boolean => {
    if (!selected) return false;
    if (Array.isArray(selected)) {
      return selected.some(
        (s) =>
          s.getFullYear() === date.getFullYear() &&
          s.getMonth() === date.getMonth() &&
          s.getDate() === date.getDate()
      );
    }
    return (
      selected.getFullYear() === date.getFullYear() &&
      selected.getMonth() === date.getMonth() &&
      selected.getDate() === date.getDate()
    );
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, monthIndex, i));
  }

  const monthName = currentMonth.toLocaleString("default", { month: "long" });

  return (
    <div className={cn("p-3", className)} {...props}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {monthName} {year}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="text-muted-foreground font-medium py-1"
          >
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} />;
          }

          const isDisabled = disabled?.(date) ?? false;
          const selected_ = isSelected(date);
          const today = isToday(date);

          let modifierClasses = "";
          if (modifiers && modifiersClassNames) {
            for (const [key, fn] of Object.entries(modifiers)) {
              if (fn(date) && modifiersClassNames[key]) {
                modifierClasses += ` ${modifiersClassNames[key]}`;
              }
            }
          }

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(date)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isDisabled && "pointer-events-none opacity-50",
                selected_ &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                today && !selected_ && "bg-accent text-accent-foreground",
                modifierClasses
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
