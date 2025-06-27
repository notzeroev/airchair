"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, Trash2, Text, SquareSigma } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Cell } from "./cell";
import { useVirtualizer } from "@tanstack/react-virtual";
import LoadingIcon from "./loading";

interface DynamicTableProps {
  tableId: string;
  viewId: string;
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

export function DynamicTable({ tableId, viewId }: DynamicTableProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<"text" | "number">("text");
  
  // Batch add state
  const [batchProgress, setBatchProgress] = useState<{
    isRunning: boolean;
    current: number;
    total: number;
  }>({ isRunning: false, current: 0, total: 0 });

  // Simplified cell state management
  const [activeCell, setActiveCell] = useState<{
    cellId: string;
    rowIndex: number;
    columnIndex: number;
  } | null>(null);

  // --- Add editing state for cell editing ---
  const [editingCell, setEditingCell] = useState<{
    cellId: string;
    rowIndex: number;
    columnIndex: number;
  } | null>(null);

  const { data: tableData, isLoading, error } = api.tables.getTableData.useQuery(
    { tableId, viewId },
    { enabled: !!tableId }
  );

  const utils = api.useUtils();

  const addRowMutation = api.tables.addRow.useMutation({
    onSuccess: () => void utils.tables.getTableData.invalidate({ tableId, viewId }),
  });

  const addRowsMutation = api.tables.addRows.useMutation({
    onSuccess: () => void utils.tables.getTableData.invalidate({ tableId, viewId }),
  });

  const addManyRowsMutation = api.tables.addRows.useMutation({
    onSuccess: () => void utils.tables.getTableData.invalidate({ tableId, viewId }),
  });

  const addColumnMutation = api.tables.addColumn.useMutation({
    onSuccess: () => void utils.tables.getTableData.invalidate({ tableId, viewId }),
  });

  const deleteColumnMutation = api.tables.deleteColumn.useMutation({
    onSuccess: () => void utils.tables.getTableData.invalidate({ tableId, viewId }),
  });

  const updateColumnMutation = api.tables.updateColumn.useMutation({
    onSuccess: () => {
      void utils.tables.getTableData.invalidate({ tableId });
      setIsEditModalOpen(false);
      setEditingColumn(null);
    },
  });

  // --- Cell update mutation with optimistic update ---
  const updateCellMutation = api.tables.updateCell.useMutation({
    onSuccess: () => void utils.tables.getTableData.invalidate({ tableId, viewId })
  });

  const handleBatchAddRows = async () => {
    const totalBatches =  10;
    const rowsPerBatch = 1000;
    
    setBatchProgress({ isRunning: true, current: 0, total: totalBatches });
    
    try {
      for (let i = 0; i < totalBatches; i++) {
        setBatchProgress({ isRunning: true, current: i + 1, total: totalBatches });
        
        await addManyRowsMutation.mutateAsync({ 
          tableId, 
          count: rowsPerBatch 
        });
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Refresh table data after completion
      void utils.tables.getTableData.invalidate({ tableId, viewId });
    } catch (error) {
      console.error('Batch add failed:', error);
    } finally {
      setBatchProgress({ isRunning: false, current: 0, total: 0 });
    }
  };

  // --- Cell editing handlers ---
  const handleCellEditStart = (cellId: string, rowIndex: number, columnIndex: number) => {
    setEditingCell({ cellId, rowIndex, columnIndex });
    setActiveCell({ cellId, rowIndex, columnIndex });
  };
  const handleCellEditEnd = (cellId: string, columnType: "text" | "number", newValue: string) => {
    setEditingCell(null);

    let currentValue: string | number | null = null;

    for (const row of tableData?.rows || []) {
      for (const cell of row.cells) {
        if (cell.id === cellId) {
          currentValue = columnType === "text" ? cell.value_text : cell.value_number;

          // Optimistically update the value
          if (columnType === "text") {
            cell.value_text = newValue;
          } else {
            cell.value_number = Number(newValue);
          }
        }
      }
    }

    const currentValueStr = currentValue === null || currentValue === undefined ? "" : String(currentValue);

    if (currentValueStr !== newValue) {
      updateCellMutation.mutate({ cellId, value: newValue, columnType });
    }
  };

  const handleEditColumn = useCallback((column: Column) => {
    setEditingColumn(column);
    setColumnName(column.name);
    setColumnType(column.type);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveColumn = () => {
    if (!editingColumn) return;
    updateColumnMutation.mutate({ columnId: editingColumn.id, name: columnName, type: columnType });
  };

  const handleDeleteColumn = () => {
    if (!editingColumn) return;
    deleteColumnMutation.mutate({ columnId: editingColumn.id });
    setIsEditModalOpen(false);
    setEditingColumn(null);
  };

  const tableRef = useRef<HTMLTableElement>(null);

  const handleCellActivate = useCallback((cellId: string, rowIndex: number, columnIndex: number) => {
    setActiveCell({ cellId, rowIndex, columnIndex });
  }, []);

  const clearActiveCell = useCallback(() => {
    setActiveCell(null);
    setEditingCell(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        clearActiveCell();
        setEditingCell(null); // Also clear editing state when clicking outside
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clearActiveCell]);

  const handleTableKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    // Don't handle navigation if any cell is being edited
    if (editingCell) return;
    
    if (!activeCell || !tableData?.rows) return;

    const maxRows = tableData.rows.length;
    const maxCols = tableData.columns?.length || 0;

    let newRow = activeCell.rowIndex;
    let newCol = activeCell.columnIndex;

    switch (event.key) {
      case "Tab":
        if (event.shiftKey) {
          newCol = Math.max(newCol - 1, 0);
        } else {
          newCol = Math.min(newCol + 1, maxCols - 1);
        }
        break;
      case "ArrowRight": 
        newCol = Math.min(newCol + 1, maxCols - 1); 
        break;
      case "ArrowLeft": 
        newCol = Math.max(newCol - 1, 0); 
        break;
      case "ArrowDown": 
        newRow = Math.min(newRow + 1, maxRows - 1); 
        break;
      case "ArrowUp": 
        newRow = Math.max(newRow - 1, 0); 
        break;
      default: 
        return;
    }

    // Find the cell at the new position
    const targetRow = tableData.rows[newRow];
    if (targetRow && tableData.columns) {
      const targetColumn = tableData.columns[newCol];
      if (targetColumn) {
        const targetCell = targetRow.cells.find(c => c.column_id === targetColumn.id);
        if (targetCell) {
          setActiveCell({
            cellId: targetCell.id,
            rowIndex: newRow,
            columnIndex: newCol,
          });
          event.preventDefault();
        }
      }
    }
  };

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    if (!tableData?.columns) return [];

    const indexColumn: ColumnDef<Row> = {
      id: "index",
      header: () => null,
      cell: ({ row }) => <div className="flex items-center justify-start pl-4 py-2 text-muted-foreground text-xs">{row.index + 1}</div>,
      enableSorting: false,
      enableResizing: false,
    };

    const dynamicColumns: ColumnDef<Row>[] = tableData.columns.map((col: Column, colIdx) => ({
      id: col.id,
      header: () => (
        <div className="flex items-center justify-between group p-2 overflow-hidden">
          <span className="flex items-center gap-2 font-semibold text-sm truncate flex-1 min-w-0">
            {col.type === "text" && <Text className="h-4 w-4 text-muted-foreground" />}
            {col.type === "number" && <SquareSigma className="h-4 w-4 text-muted-foreground" />}
            {col.name}
          </span>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 box-border border-2 border-transparent" onClick={() => handleEditColumn(col)} disabled={updateColumnMutation.isPending}>
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      ),
      accessorFn: (row: Row) => {
        const cell = row.cells.find(c => c.column_id === col.id);
        return { cellId: cell?.id || "", value: col.type === "text" ? cell?.value_text : cell?.value_number, columnType: col.type };
      },
      cell: (cellContext) => {
        const { cellId, columnType } = cellContext.getValue() as any;
        const row = cellContext.row;
        const column = cellContext.column;
        const dataColumnIndex = column.getIndex() - 1;
        const isActive = activeCell?.rowIndex === row.index && activeCell?.columnIndex === dataColumnIndex;
        const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnIndex === dataColumnIndex;
        // Directly get value from tableData
        let value: string | number | null = null;
        for (const r of tableData?.rows || []) {
          for (const c of r.cells) {
            if (c.id === cellId) {
              value = columnType === "text" ? c.value_text : c.value_number;
            }
          }
        }
        return (
          <Cell
            value={value}
            cellId={cellId}
            columnType={columnType}
            isActive={isActive}
            isEditing={isEditing}
            onActivate={() => setActiveCell({ cellId, rowIndex: row.index, columnIndex: dataColumnIndex })}
            onEditStart={() => handleCellEditStart(cellId, row.index, dataColumnIndex)}
            onEditEnd={(newValue) => handleCellEditEnd(cellId, columnType, newValue)}
          />
        );
      },
      enableSorting: false,
      enableResizing: false,
    }));

    const actionsColumn: ColumnDef<Row> = {
      id: "actions",
      header: () => (
        <div className="flex justify-center hover:scale-120 transition-transform">
          <Button variant="ghost" size="sm" onClick={() => addColumnMutation.mutate({ tableId })} disabled={addColumnMutation.isPending} className="h-6 w-6 p-0" title="Add Column">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <></>
      ),
      enableSorting: false,
      enableResizing: false,
    };

    return [indexColumn, ...dynamicColumns, actionsColumn];
  }, [tableData?.columns, addColumnMutation, deleteColumnMutation, updateColumnMutation.isPending, tableId, handleEditColumn, handleCellActivate, activeCell, editingCell]);

  const table = useReactTable({
    data: tableData?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

    //virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 41, // Adjust based on average row height
    overscan: 10,
  });
  

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center flex flex-col items-center gap-4">
              <LoadingIcon />
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
    <div className="w-fit w-full h-full">
      
      {/* virt stuff */}
      <div className="border border-border border-t-0 overflow-hidden h-full">
        {/* Table with scroll */}
        <div ref={parentRef} className="overflow-auto"
          style={{ height: "calc(100vh - 200px)" }}>
          <div className="overflow-x-auto overflow-y-hidden w-full border-b">
            <table
              ref={tableRef}
              className="focus:outline-none"
              tabIndex={-1}
              onKeyDown={handleTableKeyDown}
            >
              <thead className="bg-muted sticky top-0 z-10 border-r border-border">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isIndexColumn = header.column.id === "index";
                      const isActionsColumn = header.column.id === "actions";
                      return (
                        <th
                          key={header.id}
                          className={`text-left font-medium text-sm border-r last:border-r-0 border-border ${
                            isIndexColumn || isActionsColumn
                              ? "w-16 min-w-16 max-w-16" 
                              : "w-42 min-w-42 max-w-42"
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

              <tbody
                className="border-t-2 border-border"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
              >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            if (!row) return null;
            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={el => rowVirtualizer.measureElement(el)}
                className={`border-b border-border last:border-transparent hover:bg-muted/50 ${
            virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
                style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => {
            const isIndexColumn = cell.column.id === "index";
            const isActionsColumn = cell.column.id === "actions";
            if(!isActionsColumn) {
              return (
                <td
                  key={cell.id}
                  className={`p-0 border-r-1 ${
              isIndexColumn || isActionsColumn
                ? "w-16"
                : "w-42"
                  }`
                }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              );
            }
                })}
              </tr>
            );
          })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="relative border-t border-border">
          <Button
            onClick={() => addRowMutation.mutate({ tableId })}
            disabled={addRowMutation.isPending}
            variant="ghost"
            className="w-full h-10 flex items-center justify-start gap-2 rounded-none"
          >
            <Plus className=" text-muted-foreground h-4 w-4" />
          </Button>
          <div className="absolute left-16 top-1/2 -translate-y-1/2 flex gap-2">
            <Button
              onClick={() => addRowsMutation.mutate({ tableId, count: 100 })}
              variant="outline"
              disabled={addRowsMutation.isPending || batchProgress.isRunning}
              size="sm"
              className="h-8 px-3 flex items-center gap-1"
            >
              {addRowsMutation.isPending ? (
                <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              100 Rows
            </Button>
            <Button
              onClick={handleBatchAddRows}
              variant="outline"
              disabled={batchProgress.isRunning}
              size="sm"
              className="h-8 px-3 flex items-center gap-1"
            >
              {batchProgress.isRunning ? (
                <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {batchProgress.isRunning 
                ? `${batchProgress.current}/${batchProgress.total}K Rows` 
                : "10K Rows"
              }
            </Button>
          </div>
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