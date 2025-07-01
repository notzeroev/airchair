"use client";

import React, { useState, useDeferredValue, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";

type GlobalSearchProps = {
  tableId: string;
  viewId: string;
};

export const GlobalSearch = ({ tableId, viewId }: GlobalSearchProps) => {
  const [inputValue, setInputValue] = useState("");
  const deferredValue = useDeferredValue(inputValue);

  const { data: currentView } = api.views.getViewById.useQuery(
    { viewId },
    { enabled: !!viewId }
  );

  const updateViewQueryMutation = api.views.updateView.useMutation({
    onSuccess: () => {
      void utils.views.getViewById.invalidate({ viewId });
      void utils.tables.getTableData.invalidate({ tableId, viewId });
    },
  });

  const utils = api.useUtils();

  useEffect(() => {
    setInputValue(currentView?.query || "");
  }, [currentView?.query]);

  useEffect(() => {
    const currentQuery = currentView?.query || "";
    const isDifferent = deferredValue !== currentQuery;
    
    if (!isDifferent) return;

    const timeoutId = setTimeout(() => {
      updateViewQueryMutation.mutate({
        viewId,
        query: deferredValue,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [deferredValue, currentView?.query, viewId, updateViewQueryMutation]);

  return (
    <div className="p-2 w-64">
      <div className="relative">
        <Input
          placeholder="Search..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          className="w-full pr-8"
          autoFocus
        />
        {updateViewQueryMutation.isPending && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};