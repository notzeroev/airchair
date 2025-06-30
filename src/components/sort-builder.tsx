"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useState, useEffect } from "react";

type SortState = {
  id?: string; // undefined for new sorts
  columnId: string;
  direction: "asc" | "desc";
  order_index?: number;
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
};

type SortBuilderProps = {
  tableId: string;
  viewId: string;
};

export const SortBuilder = ({ tableId, viewId }: SortBuilderProps) => {
  const utils = api.useUtils();
  const [localSorts, setLocalSorts] = useState<SortState[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: serverSorts, isLoading, error } = api.sorts.getSorts.useQuery(
    { viewId },
    { enabled: !!viewId }
  );

  const { data: columns, isLoading: isLoadingColumns, error: errorColumns } = api.views.getColumns.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  // Initialize local sorts from server data
  useEffect(() => {
    if (serverSorts) {
      const initialSorts: SortState[] = serverSorts.map((sort, idx) => ({
        id: sort.id,
        columnId: sort.columnId,
        direction: sort.direction,
        order_index: sort.order_index ?? idx,
      }));
      setLocalSorts(initialSorts);
      setHasChanges(false);
    }
  }, [serverSorts]);

  const createSortMutation = api.sorts.createSort.useMutation();
  const updateSortMutation = api.sorts.updateSort.useMutation();
  const deleteSortMutation = api.sorts.deleteSort.useMutation();

  const addNewSort = () => {
    const newSort: SortState = {
      columnId: "",
      direction: "asc",
      order_index: localSorts.length,
      isNew: true,
    };
    setLocalSorts([...localSorts, newSort]);
    setHasChanges(true);
  };

  const updateLocalSort = (index: number, updates: Partial<SortState>) => {
    const updatedSorts = [...localSorts];
    const currentSort = updatedSorts[index]!;

    updatedSorts[index] = {
      ...currentSort,
      ...updates,
      isModified: !currentSort.isNew, // Only mark as modified if it's not a new sort
    };

    setLocalSorts(updatedSorts);
    setHasChanges(true);
  };

  const removeLocalSort = (index: number) => {
    const sort = localSorts[index]!;

    if (sort.isNew) {
      // Remove new sorts immediately
      const updatedSorts = localSorts.filter((_, i) => i !== index);
      setLocalSorts(updatedSorts);
    } else {
      // Mark existing sorts for deletion
      const updatedSorts = [...localSorts];
      updatedSorts[index] = { ...sort, isDeleted: true };
      setLocalSorts(updatedSorts);
    }
    setHasChanges(true);
  };

  const applyChanges = async () => {
    try {
      // Process all changes
      for (const [idx, sort] of localSorts.entries()) {
        if (sort.isDeleted && sort.id) {
          // Delete existing sort
          await deleteSortMutation.mutateAsync({ sortId: sort.id });
        } else if (sort.isNew && sort.columnId) {
          // Create new sort
          await createSortMutation.mutateAsync({
            viewId,
            columnId: sort.columnId,
            direction: sort.direction,
            order_index: idx,
          });
        } else if (sort.isModified && sort.id && sort.columnId) {
          // Update existing sort
          await updateSortMutation.mutateAsync({
            sortId: sort.id,
            columnId: sort.columnId,
            direction: sort.direction,
            order_index: idx,
          });
        }
      }

      await utils.sorts.getSorts.invalidate({ viewId });
      await utils.tables.getTableData.invalidate({ tableId, viewId });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to apply sort changes:', error);
    }
  };

  const resetChanges = () => {
    if (serverSorts) {
      const resetSorts: SortState[] = serverSorts.map((sort, idx) => ({
        id: sort.id,
        columnId: sort.columnId,
        direction: sort.direction,
        order_index: sort.order_index ?? idx,
      }));
      setLocalSorts(resetSorts);
      setHasChanges(false);
    }
  };

  if (errorColumns) {
    return <div>Error loading columns: {errorColumns.message}</div>;
  }

  if (isLoading || isLoadingColumns) {
    return <div>Loading...</div>;
  }

  const visibleSorts = localSorts.filter(sort => !sort.isDeleted);
  const isApplyDisabled = !hasChanges || localSorts.some(sort =>
    !sort.isDeleted && !sort.columnId
  );

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pl-2">
          <p className="text-xs text-muted-foreground">Sort rows by</p>
        </div>

        {visibleSorts.length > 0 && (
          <div className="space-y-2">
            {visibleSorts.map((sort, index) => {
              const actualIndex = localSorts.indexOf(sort);

              return (
                <div key={actualIndex} className="flex">
                  <div className="w-full grid grid-cols-2 grid-rows-auto">
                    <div>
                      <Select
                        value={sort.columnId}
                        onValueChange={(value) => updateLocalSort(actualIndex, { columnId: value })}
                      >
                        <SelectTrigger className="w-full rounded-none">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns?.columns.map((column) => (
                            <SelectItem key={column.id} value={column.id}>
                              {column.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Select
                        value={sort.direction}
                        onValueChange={(value) => updateLocalSort(actualIndex, { direction: value as "asc" | "desc" })}
                        disabled={!sort.columnId}
                      >
                        <SelectTrigger className="w-full rounded-none border-l-0">
                          <SelectValue placeholder="Direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Button
                      variant="ghost"
                      onClick={() => removeLocalSort(actualIndex)}
                      className="hover:bg-muted hover:text-red-600 rounded-none border-1 border-l-0 border-border"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-start gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addNewSort}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Sort
          </Button>
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={applyChanges}
              disabled={isApplyDisabled}
              className="gap-1 bg-primary text-white hover:bg-primary/80 hover:text-white"
            >
              Apply
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="p-4">
          <p className="text-red-600">Error: {error.message}</p>
        </Card>
      )}
    </div>
  );
};