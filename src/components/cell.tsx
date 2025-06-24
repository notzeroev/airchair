"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CellProps {
  value: string | number | null;
  cellId: string;
  columnType: "text" | "number";
  isActive: boolean;
  isEditing: boolean;
  onActivate: () => void;
  onEditStart: () => void;
  onEditEnd: (newValue: string) => void;
}

export function Cell({
  value,
  columnType,
  isActive,
  isEditing,
  onActivate,
  onEditStart,
  onEditEnd,
}: CellProps) {
  const [editValue, setEditValue] = useState(value === null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Keep editValue in sync with value when not editing
  useEffect(() => {
    if (!isEditing) setEditValue(value === null ? "" : String(value));
  }, [value, isEditing]);

  // Focus the cell div when it becomes active (but only if not editing)
  useEffect(() => {
    if (isActive && !isEditing && cellRef.current) {
      // Only focus if the current focused element is not an input or textarea
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (!isInputFocused) {
        cellRef.current.focus();
      }
    }
  }, [isActive, isEditing]);

  // Handle click to activate or start editing if already active
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      if (isActive) {
        onEditStart();
      } else {
        onActivate();
      }
    }
  };

  // Keydown to start editing (only on Enter, and stop propagation)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing && isActive && e.key === "Enter") {
      onEditStart();
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Save on enter, cancel on escape
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent table navigation while editing
    if (e.key === "Enter") {
      onEditEnd(editValue);
    } else if (e.key === "Escape") {
      setEditValue(value === null ? "" : String(value));
      onEditEnd(value === null ? "" : String(value));
    }
  };

  // Save on blur
  const handleInputBlur = () => {
    onEditEnd(editValue);
  };

  return (
    <div
      ref={cellRef}
      className={cn(
        "px-3 py-2 min-h-10 max-w-[calc(10.5rem-1px)] flex items-center text-sm cursor-pointer transition-colors focus:outline-none border-2 border-transparent",
        isActive && "border-2 border-blue-600 text-blue-600",  
        isEditing && "text-bg-foreground"
      )}
      tabIndex={isActive && !isEditing ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="gridcell"
      aria-selected={isActive}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type={columnType === "number" ? "number" : "text"}
          className="w-full h-full bg-transparent outline-none text-sm px-0 py-0"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="truncate w-full select-none">
          {value === null || value === undefined || value === "" ? <span className="text-muted-foreground">&nbsp;</span> : String(value)}
        </span>
      )}
    </div>
  );
}