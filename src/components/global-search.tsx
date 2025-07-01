"use client";

import React, { useState, useDeferredValue, useEffect } from "react";
import { api } from "@/trpc/react";
import { Input } from "@/components/ui/input";

type GlobalSearchProps = {
  tableId: string;
  query: string;
  setQuery: (q: string) => void;
};

export const GlobalSearch = ({ tableId, query, setQuery }: GlobalSearchProps) => {
  const [inputValue, setInputValue] = useState(query || "");
  const deferredValue = useDeferredValue(inputValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery(deferredValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [deferredValue, setQuery]);

  useEffect(() => {
    setInputValue(query || "");
  }, [query]);

  return (
    <div className="p-2 w-64">
      <Input
        placeholder="Search..."
        value={inputValue || ""}
        onChange={e => setInputValue(e.target.value)}
        className="w-full"
        autoFocus
      />
    </div>
  );
};