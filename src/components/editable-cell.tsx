"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/trpc/react";

interface EditableCellProps {
  cellId: string;
  value: string | number | null;
  columnType: "text" | "number";
  tableId: string;
}

const toStr = (val: string | number | null) => String(val ?? "");

export function EditableCell({ cellId, value, columnType, tableId }: EditableCellProps) {
  type Mode = "idle" | "selected" | "editing";
  const [mode, setMode] = useState<Mode>("idle");
  const [editValue, setEditValue] = useState(toStr(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  const updateCell = api.tables.updateCell.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
      setMode("selected");
    },
    onError: (error) => {
      console.error("Failed to update cell:", error.message);
      setEditValue(toStr(value));
      setMode("selected");
    },
  });

  useEffect(() => {
    setEditValue(toStr(value)); // Sync with latest value from server
  }, [value]);

  useEffect(() => {
    if (mode === "editing" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        setMode("idle");
      }
    };
    if (mode !== "idle") {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mode]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (mode === "selected") {
        if (event.key === "F2") {
          event.preventDefault();
          setEditValue(toStr(value));
          setMode("editing");
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          setEditValue(event.key);
          setMode("editing");
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          updateCell.mutate({ cellId, value: "", columnType });
          setMode("idle");
        }
      }
    };
    if (mode !== "idle") {
      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }
  }, [mode, value, cellId, columnType, updateCell]);

  const handleClick = () => setMode("selected");

  const handleDoubleClick = () => {
    setEditValue(toStr(value));
    setMode("editing");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditValue(toStr(value));
      setMode("selected");
    }
  };

  const handleBlur = () => handleSave();

  const handleSave = () => {
    if (editValue !== toStr(value)) {
      if (columnType === "number" && isNaN(Number(editValue))) return;
      updateCell.mutate({ cellId, value: editValue, columnType });
    } else {
      setMode("selected");
    }
  };

  const isSelected = mode === "selected" || mode === "editing";
  const isEditing = mode === "editing";

  if (isEditing) {
    return (
      <div ref={cellRef} className="w-full h-full">
        <input
          ref={inputRef}
          type={columnType === "number" ? "number" : "text"}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full h-full px-1 py-0.5 border-0 outline-none ring-2 ring-blue-500 bg-background"
          disabled={updateCell.isPending}
        />
      </div>
    );
  }

  return (
    <div
      ref={cellRef}
      className={`w-full h-full px-1 py-0.5 min-h-[24px] flex items-center cursor-text transition-all duration-150 ${
        isSelected
          ? "bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950/50"
          : "hover:bg-muted/25"
      } ${updateCell.isPending ? "opacity-50" : ""}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={editValue || ""}
    >
      {editValue ? (
        <span className={`truncate ${updateCell.isPending ? "opacity-70" : ""}`}>{editValue}</span>
      ) : (
        <span className="text-muted-foreground italic text-xs"></span>
      )}
      {updateCell.isPending && (
        <div className="ml-1 w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
      )}
    </div>
  );
}