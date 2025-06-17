"use client";

import { useMemo, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EditableCell } from "./editable-cell";

interface DynamicTableProps {
  tableId: string;
  tableName?: string;
}

interface Column {
  id: string;
  name: string;
  type: "text" | "number";
  position: number;
}

interface Cell {
  id: string;
  column_id: string;
  value_text: string | null;
  value_number: number | null;
}

interface Row {
  id: string;
  cells: Cell[];
}

export function DynamicTable({ tableId }: DynamicTableProps) {
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [columnName, setColumnName] = useState<string>("");
  const [columnType, setColumnType] = useState<"text" | "number">("text");

  // Fetch table data
  const { data: tableData, isLoading, error } = api.tables.getTableData.useQuery(
    { tableId },
    { enabled: !!tableId }
  );

  // Mutations
  const utils = api.useUtils();
  
  const addRowMutation = api.tables.addRow.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
    },
  });

  const add100RowsMutation = api.tables.add100Rows.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
    },
  });

  const deleteRowMutation = api.tables.deleteRow.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
    },
  });

  const addColumnMutation = api.tables.addColumn.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
    },
  });

  const deleteColumnMutation = api.tables.deleteColumn.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
    },
  });

  const updateColumnMutation = api.tables.updateColumn.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
      setIsEditModalOpen(false);
      setEditingColumn(null);
    },
  });

  // Modal handlers
  const handleEditColumn = useCallback((column: Column) => {
    setEditingColumn(column);
    setColumnName(column.name);
    setColumnType(column.type);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveColumn = () => {
    if (!editingColumn) return;
    
    updateColumnMutation.mutate({
      columnId: editingColumn.id,
      name: columnName,
      type: columnType,
    });
  };

  const handleDeleteColumn = () => {
    if (!editingColumn) return;
    
    deleteColumnMutation.mutate({ columnId: editingColumn.id });
    setIsEditModalOpen(false);
    setEditingColumn(null);
  };

  // Create table columns dynamically
  const columns = useMemo<ColumnDef<Row>[]>(() => {
    if (!tableData?.columns) return [];

    // Index column
    const indexColumn: ColumnDef<Row> = {
      id: "index",
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-start pl-4 py-2 text-muted-foreground text-xs">
          {row.index + 1}
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
    };

    // Dynamic data columns
    const dynamicColumns: ColumnDef<Row>[] = tableData.columns.map((col: Column) => ({
      id: col.id,
      header: () => (
        <div className="flex items-center justify-between group px-2 overflow-hidden">
          <span className="font-semibold text-sm truncate flex-1 min-w-0">{col.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 flex-shrink-0"
            onClick={() => handleEditColumn(col)}
            disabled={updateColumnMutation.isPending}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      ),
      accessorFn: (row: Row): { cellId: string; value: string | number | null; columnType: "text" | "number" } => {
        const cell = row.cells.find((c) => c.column_id === col.id);
        if (!cell) return { cellId: "", value: "", columnType: col.type };
        return {
          cellId: cell.id,
          value: col.type === "text" ? cell.value_text : cell.value_number,
          columnType: col.type
        };
      },
      cell: (cellContext) => {
        const cellData = cellContext.getValue() as { cellId: string; value: string | number | null; columnType: "text" | "number" };
        return (
          <EditableCell
            cellId={cellData.cellId}
            value={cellData.value}
            columnType={cellData.columnType}
            tableId={tableId}
          />
        );
      },
      enableSorting: false,
      enableResizing: false,
    }));

    // Actions column
    const actionsColumn: ColumnDef<Row> = {
      id: "actions",
      header: () => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addColumnMutation.mutate({ tableId })}
            disabled={addColumnMutation.isPending}
            className="h-6 w-6 p-0"
            title="Add Column"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteRowMutation.mutate({ rowId: row.original.id })}
            disabled={deleteRowMutation.isPending}
            className="h-6 w-6 p-0 opacity-50 hover:opacity-100 hover:text-destructive"
            title="Delete Row"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
    };

    return [indexColumn, ...dynamicColumns, actionsColumn];
  }, [tableData?.columns, addColumnMutation, deleteRowMutation, updateColumnMutation.isPending, tableId, handleEditColumn]);

  const table = useReactTable({
    data: tableData?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="relative w-8 h-8 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-muted"></div>
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
            <p className="text-muted-foreground text-sm">Loading table data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error loading table</h3>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-fit max-w-full">
      <div className="border border-border overflow-hidden">
        {/* Table with horizontal scroll */}
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isIndexColumn = header.column.id === "index";
                    const isActionsColumn = header.column.id === "actions";
                    return (
                      <th
                        key={header.id}
                        className={`text-left font-medium text-sm ${
                          isIndexColumn || isActionsColumn
                            ? "w-16 min-w-16 max-w-16 p-0" 
                            : "w-40 min-w-40 max-w-40 border-r border-border last:border-r-0 py-2"
                        }`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr 
                  key={row.id} 
                  className={`border-t border-border hover:bg-muted/30 ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isIndexColumn = cell.column.id === "index";
                    const isActionsColumn = cell.column.id === "actions";
                    return (
                      <td 
                        key={cell.id} 
                        className={`p-0 overflow-hidden ${
                          isIndexColumn || isActionsColumn
                            ? "w-16 min-w-16 max-w-16" 
                            : " w-40 min-w-40 max-w-40 border-r border-border last:border-r-0"
                        }`}
                      >
                        <div className="truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Add row button - outside table but inside container */}
        <div className="relative border-t border-border">
          <Button
            onClick={() => addRowMutation.mutate({ tableId })}
            disabled={addRowMutation.isPending}
            variant="ghost"
            className="w-full h-10 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          <Button
            onClick={() => {
                add100RowsMutation.mutate({ tableId });
            }}
            variant="outline"
            disabled={addRowMutation.isPending}
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            100
          </Button>
        </div>
      </div>

      {/* Edit Column Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="column-name" className="block text-sm font-medium mb-2">
                Column Name
              </label>
              <input
                id="column-name"
                type="text"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter column name"
              />
            </div>
            
            <div>
              <label htmlFor="column-type" className="block text-sm font-medium mb-2">
                Column Type
              </label>
              <select
                id="column-type"
                value={columnType}
                onChange={(e) => setColumnType(e.target.value as "text" | "number")}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteColumn}
              disabled={deleteColumnMutation.isPending}
              className="mr-auto text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Column
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveColumn}
              disabled={updateColumnMutation.isPending || !columnName.trim()}
            >
              {updateColumnMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}