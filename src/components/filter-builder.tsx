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
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";

const TEXT_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "is_empty", label: "Is empty" },
  { value: "not_empty", label: "Is not empty" },
];

const NUMBER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "is_empty", label: "Is empty" },
  { value: "not_empty", label: "Is not empty" },
];

const ALL_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "is_empty", label: "Is empty" },
  { value: "not_empty", label: "Is not empty" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
];

type FilterState = {
  id?: string; // undefined for new filters
  columnId: string;
  operator: string;
  value: string;
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
};

type FilterBuilderProps = {
  tableId: string;
  viewId: string;
};

export const FilterBuilder = ({ tableId, viewId }: FilterBuilderProps) => {
  const utils = api.useUtils();
  const [localFilters, setLocalFilters] = useState<FilterState[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: serverFilters, isLoading, error } = api.filters.getFilters.useQuery(
    { viewId },
    { enabled: !!viewId }
  );

  const { data: columns, isLoading: isLoadingColumns, error: errorColumns } = api.views.getColumns.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  // Initialize local filters from server data
  useEffect(() => {
    if (serverFilters) {
      const initialFilters: FilterState[] = serverFilters.map(filter => ({
        id: filter.id,
        columnId: filter.columnId,
        operator: filter.operator,
        value: filter.value_text || filter.value_number?.toString() || "",
      }));
      setLocalFilters(initialFilters);
      setHasChanges(false);
    }
  }, [serverFilters]);

  const createFilterMutation = api.filters.createFilter.useMutation();
  const updateFilterMutation = api.filters.updateFilter.useMutation();
  const deleteFilterMutation = api.filters.deleteFilter.useMutation();

  const addNewFilter = () => {
    const newFilter: FilterState = {
      columnId: "",
      operator: "",
      value: "",
      isNew: true,
    };
    setLocalFilters([...localFilters, newFilter]);
    setHasChanges(true);
  };

  const updateLocalFilter = (index: number, updates: Partial<FilterState>) => {
    const updatedFilters = [...localFilters];
    const currentFilter = updatedFilters[index]!;
    
    updatedFilters[index] = {
      ...currentFilter,
      ...updates,
      isModified: !currentFilter.isNew, // Only mark as modified if it's not a new filter
    };

    // Handle column type changes - reset operator if incompatible
    if (updates.columnId && updates.columnId !== currentFilter.columnId) {
      const newColumn = columns?.columns.find(col => col.id === updates.columnId);
      const availableOps = newColumn?.type === 'number' ? NUMBER_OPERATORS : TEXT_OPERATORS;
      const isOperatorValid = availableOps.some(op => op.value === currentFilter.operator);
      
      if (!isOperatorValid) {
        updatedFilters[index]!.operator = "";
      }
    }

    setLocalFilters(updatedFilters);
    setHasChanges(true);
  };

  const removeLocalFilter = (index: number) => {
    const filter = localFilters[index]!;
    
    if (filter.isNew) {
      // Remove new filters immediately
      const updatedFilters = localFilters.filter((_, i) => i !== index);
      setLocalFilters(updatedFilters);
    } else {
      // Mark existing filters for deletion
      const updatedFilters = [...localFilters];
      updatedFilters[index] = { ...filter, isDeleted: true };
      setLocalFilters(updatedFilters);
    }
    setHasChanges(true);
  };

  const getAvailableOperators = (columnId: string) => {
    const column = columns?.columns.find(col => col.id === columnId);
    return column?.type === 'number' ? NUMBER_OPERATORS : TEXT_OPERATORS;
  };

  const getColumnType = (columnId: string) => {
    const column = columns?.columns.find(col => col.id === columnId);
    return column?.type || 'text';
  };

  const applyChanges = async () => {
    try {
      // Process all changes
      for (const filter of localFilters) {
        if (filter.isDeleted && filter.id) {
          // Delete existing filter
          await deleteFilterMutation.mutateAsync({ filterId: filter.id });
        } else if (filter.isNew && filter.columnId && filter.operator) {
          // Create new filter
          const columnType = getColumnType(filter.columnId);
          const isNumber = columnType === 'number';
          
          await createFilterMutation.mutateAsync({
            viewId,
            columnId: filter.columnId,
            operator: filter.operator,
            value_text: !isNumber ? filter.value : null,
            value_number: isNumber ? Number(filter.value) : null,
          });
        } else if (filter.isModified && filter.id && filter.columnId && filter.operator) {
          // Update existing filter
          const columnType = getColumnType(filter.columnId);
          const isNumber = columnType === 'number';
          
          await updateFilterMutation.mutateAsync({
            filterId: filter.id,
            columnId: filter.columnId,
            operator: filter.operator,
            value_text: !isNumber ? filter.value : undefined,
            value_number: isNumber ? Number(filter.value) : undefined,
          });
        }
      }

      await utils.filters.getFilters.invalidate({ viewId });
      await utils.tables.getTableData.invalidate({ tableId, viewId });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to apply filter changes:', error);
    }
  };

  const resetChanges = () => {
    if (serverFilters) {
      const resetFilters: FilterState[] = serverFilters.map(filter => ({
        id: filter.id,
        columnId: filter.columnId,
        operator: filter.operator,
        value: filter.value_text || filter.value_number?.toString() || "",
      }));
      setLocalFilters(resetFilters);
      setHasChanges(false);
    }
  };

  if (errorColumns) {
    return <div>Error loading columns: {errorColumns.message}</div>;
  }

  if (isLoading || isLoadingColumns) {
    return <div>Loading...</div>;
  }

  const visibleFilters = localFilters.filter(filter => !filter.isDeleted);
  const isApplyDisabled = !hasChanges || localFilters.some(filter => 
    !filter.isDeleted && (!filter.columnId || !filter.operator || 
    (!filter.value && !["is_empty", "not_empty"].includes(filter.operator)))
  );

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pl-2">
          <p className="text-xs text-muted-foreground">In this view show rows where</p>
        </div>

        {visibleFilters.length > 0 && (
          <div className="space-y-2">
            {visibleFilters.map((filter, index) => {
              const actualIndex = localFilters.indexOf(filter);
              const availableOperators = getAvailableOperators(filter.columnId);
              const columnType = getColumnType(filter.columnId);
              
              return (
                <div key={actualIndex} className="flex">
                  <div className="grid grid-cols-3 grid-rows-auto">
                    <div>
                      <Select 
                        value={filter.columnId} 
                        onValueChange={(value) => updateLocalFilter(actualIndex, { columnId: value })}

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
                        value={filter.operator} 
                        onValueChange={(value) => updateLocalFilter(actualIndex, { operator: value })}
                        disabled={!filter.columnId}
                      >
                        <SelectTrigger className="w-full rounded-none border-l-0">
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOperators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Input
                        type={columnType === 'number' ? 'number' : 'text'}
                        value={filter.value}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          updateLocalFilter(actualIndex, { value: e.target.value })
                        }
                        placeholder={columnType === 'number' ? 'Enter number' : 'Enter value'}
                        disabled={filter.operator === "is_empty" || filter.operator === "not_empty"}
                        className="w-full rounded-none border-l-0"
                      />
                    </div>
                  </div>

                  <div>
                    <Button
                      variant="ghost"
                      onClick={() => removeLocalFilter(actualIndex)}
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
          onClick={addNewFilter}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Filter
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
}