"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/trpc/react";

interface EditableCellProps {
  cellId: string;
  value: string | number | null;
  columnType: "text" | "number";
  tableId: string;
}

export function EditableCell({ cellId, value, columnType, tableId }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  
  const utils = api.useUtils();
  
  const updateCell = api.tables.updateCell.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
      setIsEditing(false);
      setIsSelected(true);
    },
    onError: (error) => {
      console.error("Failed to update cell:", error.message);
      // Reset to original value on error
      setEditValue(String(value ?? ""));
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle clicking outside to deselect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        setIsSelected(false);
      }
    };

    const handleKeyPress = (event: KeyboardEvent) => {
      if (isSelected && !isEditing) {
        // F2 to edit
        if (event.key === 'F2') {
          event.preventDefault();
          setEditValue(String(value ?? ""));
          setIsEditing(true);
        }
        // Any printable character starts editing with that character
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          setEditValue(event.key);
          setIsEditing(true);
        }
        // Delete/Backspace clears the cell
        else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          updateCell.mutate({
            cellId,
            value: '',
            columnType,
          });
        }
      }
    };

    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [isSelected, isEditing, value, cellId, columnType, updateCell]);

  const handleClick = () => {
    setIsSelected(true);
  };

  const handleDoubleClick = () => {
    setEditValue(String(value ?? ""));
    setIsEditing(true);
    setIsSelected(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditValue(String(value ?? ""));
      setIsEditing(false);
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleSave = () => {
    if (editValue !== String(value ?? "")) {
      updateCell.mutate({
        cellId,
        value: editValue,
        columnType,
      });
    } else {
      setIsEditing(false);
    }
  };

  const displayValue = value === null || value === "" ? "" : String(value);

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
          ? 'bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950/50' 
          : 'hover:bg-muted/25'
      } ${updateCell.isPending ? 'opacity-50' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={displayValue || "Click to select, double-click to edit, F2 to edit, or just start typing"}
    >
      {displayValue ? (
        <span className={`truncate ${updateCell.isPending ? 'opacity-70' : ''}`}>{displayValue}</span>
      ) : (
        <span className="text-muted-foreground italic text-xs">
        </span>
      )}
      {updateCell.isPending && (
        <div className="ml-1 w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
      )}
    </div>
  );
}
