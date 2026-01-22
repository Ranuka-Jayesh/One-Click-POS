import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomDatePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  onClose: () => void;
}

export function CustomDatePicker({ selectedDate, onDateSelect, onClose }: CustomDatePickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDateClick = (day: Date) => {
    if (isSameDay(day, selectedDate || new Date())) {
      onDateSelect(null);
    } else {
      onDateSelect(day);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(today);
    onDateSelect(today);
  };

  const clearSelection = () => {
    onDateSelect(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-[340px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/20 via-accent/10 to-transparent p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Select Date</h3>
              <p className="text-xs text-muted-foreground font-karla">Choose a specific date</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="w-9 h-9 rounded-lg hover:bg-secondary/80 flex items-center justify-center transition-all hover:scale-105"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="text-center">
            <h4 className="text-lg font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h4>
          </div>
          <button
            onClick={goToNextMonth}
            className="w-9 h-9 rounded-lg hover:bg-secondary/80 flex items-center justify-center transition-all hover:scale-105"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day) => {
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "aspect-square rounded-xl text-sm font-medium transition-all duration-200 relative",
                  "hover:scale-110 hover:z-10",
                  isSelected
                    ? "bg-accent text-accent-foreground shadow-lg shadow-accent/30 scale-110 z-10"
                    : isToday
                    ? "bg-accent/20 text-accent border-2 border-accent font-bold"
                    : "hover:bg-secondary text-foreground",
                  !isCurrentMonth && "opacity-30"
                )}
              >
                <span>{format(day, "d")}</span>
                {isSelected && (
                  <div className="absolute inset-0 rounded-xl bg-accent/20 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
          <button
            onClick={goToToday}
            className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium text-foreground transition-colors"
          >
            Today
          </button>
          {selectedDate && (
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Selected Date Display */}
        {selectedDate && (
          <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-xs text-muted-foreground font-karla mb-1">Selected Date:</p>
            <p className="text-sm font-semibold text-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

