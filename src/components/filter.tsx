import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Trash2, MoreVertical } from "lucide-react";

import type { Filter, FilterOperator, Field } from "@/types/filters";

// Only use allowed operators for Filter type
const operators = ["equals", "contains", "startsWith", "endsWith"] as const;
type AllowedOperator = typeof operators[number];

const operatorLabels: Record<AllowedOperator, string> = {
  equals: "Equals",
  contains: "Contains",
  startsWith: "Starts with",
  endsWith: "Ends with",
};

type FilterBuilderProps = {
  filters: Filter[];
  setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
  fields: Field[];
};

type FilterProps = {
  id: string;
  selectedField: string;
  operator: AllowedOperator;
  value: string;
  onChange: (id: string, field: string, value: string) => void;
  onDelete: () => void;
  fields: Field[];
};

function Filter({ id, selectedField, operator, value, onChange, onDelete, fields }: FilterProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    isDragging,
    transition,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transition,
      }}
      className="flex items-center gap-2 w-full p-2 border-b bg-background"
    >
      <span className="text-sm text-muted-foreground shrink-0">Where</span>
      <Select value={selectedField} onValueChange={(val) => onChange(id, "field", val)}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={operator} onValueChange={(val) => onChange(id, "operator", val as AllowedOperator)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {op.charAt(0).toUpperCase() + op.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Enter a value"
        value={value}
        onChange={(e) => onChange(id, "value", e.target.value)}
        className="w-[180px]"
      />
      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="w-4 h-4 text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
      >
        <MoreVertical className="w-4 h-4 text-muted-foreground cursor-move" />
      </Button>
    </div>
  );
}

export function FilterBuilder({ filters, setFilters, fields }: FilterBuilderProps) {
  console.log("fields: ", fields);
    
    const [activeId, setActiveId] = useState<string | null>(null);

    // Add a new filter
  const addFilter = () => {
    console.log("Adding new filter");
    if (fields.length === 0) return;
    setFilters((prev) => [
      ...prev,
      {
        field: fields[0]!, // non-null assertion since fields.length > 0
        operator: operators[0],
        value: "",
      },
    ]);
  };

  // Update a filter
  const updateFilter = (id: string, field: string, value: string) => {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.field.id !== id) return f;
        if (field === "field") {
          const newField = fields.find((fld) => fld.id === value);
          return newField ? { ...f, field: newField } : f;
        }
        if (field === "operator" && operators.includes(value as AllowedOperator)) {
          return { ...f, operator: value as AllowedOperator };
        }
        if (field === "value") {
          return { ...f, value };
        }
        return f;
      })
    );
  };

  // Delete a filter
  const deleteFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.field.id !== id));
  };

  return (
    <div className="flex flex-col gap-1 w-full pb-2 px-2">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          if (over && active.id !== over.id) {
            const oldIndex = filters.findIndex((f) => f.field.id === active.id);
            const newIndex = filters.findIndex((f) => f.field.id === over.id);
            setFilters((prev) => arrayMove(prev, oldIndex, newIndex));
          }
        }}
      >
        <SortableContext items={filters.map((f) => f.field.id)}>
          {filters.map((filter) => (
            <Filter
              key={filter.field.id}
              id={filter.field.id}
              selectedField={filter.field.id}
              operator={filter.operator as AllowedOperator}
              value={filter.value}
              onChange={updateFilter}
              onDelete={() => deleteFilter(filter.field.id)}
              fields={fields}
            />
          ))}
        </SortableContext>
        <Button variant="outline" size="sm" className="mt-2 w-fit cursor-pointer" onClick={addFilter} disabled={fields.length === 0}>
          Add Filter
        </Button>
      </DndContext>
    </div>
  );
}
