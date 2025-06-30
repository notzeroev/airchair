"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Eye, EyeOff, SquareSigma, Text } from "lucide-react";

type ColumnManagerProps = {
  tableId: string;
  viewId: string;
};

export const ColumnManager = ({ tableId, viewId }: ColumnManagerProps) => {
  const utils = api.useUtils();
  const [localHiddenColumns, setLocalHiddenColumns] = useState<string[]>([]);

  const { data: columns, isLoading: isLoadingColumns, error: errorColumns } = api.views.getColumns.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  const { data: hiddenColumnsData, isLoading: isLoadingHiddenColumns, error: errorHiddenColumns } = api.views.getHiddenColumns.useQuery(
    { viewId },
    { enabled: !!viewId }
  );

  const updateViewMutation = api.views.updateView.useMutation();

  // Initialize local hidden columns from server data
  useEffect(() => {
    if (hiddenColumnsData) {
      setLocalHiddenColumns(hiddenColumnsData.hiddenColumnIds);
    }
  }, [hiddenColumnsData]);

  const toggleColumnVisibility = async (columnId: string) => {
    const newHiddenColumns = localHiddenColumns.includes(columnId)
      ? localHiddenColumns.filter(id => id !== columnId)
      : [...localHiddenColumns, columnId];
    setLocalHiddenColumns(newHiddenColumns);
    try {
      await updateViewMutation.mutateAsync({
        viewId,
        columnIds: newHiddenColumns,
      });
      await utils.views.getHiddenColumns.invalidate({ viewId });
    } catch (error) {
      console.error('Failed to update column visibility:', error);
      // Optionally, revert local state or show a toast
    }
  };

  if (errorColumns) {
    return <div>Error loading columns: {errorColumns.message}</div>;
  }

  if (errorHiddenColumns) {
    return <div>Error loading hidden columns: {errorHiddenColumns.message}</div>;
  }

  if (isLoadingColumns || isLoadingHiddenColumns) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between pl-2">
      </div>

      {columns?.columns && columns.columns.length > 0 && (
        <div className="space-y-2">
          {columns.columns.map((column) => {
            const isHidden = localHiddenColumns.includes(column.id);
            
            return (
              <div
                key={column.id}
                className="flex items-center gap-3 rounded-sm cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => toggleColumnVisibility(column.id)}
                tabIndex={0}
                role="button"
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toggleColumnVisibility(column.id);
                  }
                }}
              >
                <Switch
                  checked={!isHidden}
                  className="ml-2 pointer-events-none"
                  tabIndex={-1}
                />
                <div className="flex items-center gap-1.5">
                  {column.type === "text" && <Text className="h-4 w-4 text-muted-foreground" />}
                  {column.type === "number" && <SquareSigma className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm">{column.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(errorColumns || errorHiddenColumns) && (
        <Card className="p-4 mt-4">
          <p className="text-destructive">
            Error loading column data
          </p>
        </Card>
      )}
    </div>
  );
};