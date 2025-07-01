import { number, z } from "zod";
import { TRPCError } from "@trpc/server";
import { faker } from "@faker-js/faker";
import { type SupabaseClient } from '@supabase/supabase-js';

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Helper function to create default columns
const createDefaultColumns = (tableId: string) => [
  { table_id: tableId, name: 'Name', type: 'text', position: 0 },
  { table_id: tableId, name: 'Age', type: 'number', position: 1 },
  { table_id: tableId, name: 'Address', type: 'text', position: 2 },
];

// Helper function to verify base access
const verifyBaseAccess = async (
  supabase: SupabaseClient,
  baseId: string,
  userId: string
) => {
  const { data: baseData, error: baseError } = await supabase
    .from('bases')
    .select('id')
    .eq('id', baseId)
    .eq('user_id', userId)
    .single();

  if (baseError || !baseData) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Base not found or you don't have access to it",
    });
  }
  return baseData;
};

// Helper function to verify table access
const verifyTableAccess = async (
  supabase: SupabaseClient,
  tableId: string,
  userId: string
) => {
  const { data: tableData, error: tableError } = await supabase
    .from('tables')
    .select(`
      id,
      bases!inner(user_id)
    `)
    .eq('id', tableId)
    .eq('bases.user_id', userId)
    .single();

  if (tableError || !tableData) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Table not found or you don't have access to it",
    });
  }
  return tableData;
};

// Helper function to generate fake data for sample rows
const generateSampleCellData = (columnIndex: number) => {
  let value_text = null;
  let value_number = null;

  // Generate data based on column position: 0=Name, 1=Age, 2=Address
  if (columnIndex === 0) { // Name
    value_text = faker.person.fullName();
  } else if (columnIndex === 1) { // Age
    value_number = faker.number.int({ min: 18, max: 69 });
  } else if (columnIndex === 2) { // Address
    value_text = faker.location.streetAddress();
  }

  return { value_text, value_number };
};

// Helper function to create sample rows with fake data
const createSampleRowsWithData = async (
  supabase: SupabaseClient,
  tableId: string,
  insertedColumns: Array<{ id: string; type: string }>,
  rowCount = 1
): Promise<Array<{ id: string }>> => {
  // Create sample rows
  const rowsToInsert = Array(rowCount).fill(null).map(() => ({ table_id: tableId }));
  
  const { data: sampleRows, error: rowsError } = await supabase
    .from('rows')
    .insert(rowsToInsert)
    .select('id');

  if (rowsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR", 
      message: `Failed to create sample rows: ${(rowsError as Error).message}`,
    });
  }

  // Create sample cells with fake data
  if (sampleRows && insertedColumns) {
    const cellsToInsert: { row_id: any; column_id: any; value_text: string | null; value_number: number | null; }[] = [];
    for (const row of sampleRows) {
      for (let i = 0; i < insertedColumns.length; i++) {
        const column = insertedColumns[i]!;
        const { value_text, value_number } = generateSampleCellData(i);

        cellsToInsert.push({
          row_id: row.id,
          column_id: column.id,
          value_text,
          value_number,
        });
      }
    }

    const { error: cellsError } = await supabase
      .from('cells')
      .insert(cellsToInsert);

    if (cellsError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to create sample cells: ${(cellsError as Error).message}`,
      });
    }
  }

  return sampleRows;
};

// Helper to get cell value for a row and column
function getCellValue(row: any, columnId: string) {
  const cell = row.cells.find((c: any) => c.column_id === columnId);
  return cell ? (cell.value_number !== null && cell.value_number !== undefined ? cell.value_number : cell.value_text) : null;
}

// Helper to compare two rows by sorts
function compareRowsBySorts(a: any, b: any, sorts: any[]) {
  for (const sort of sorts) {
    const aValue = getCellValue(a, sort.column_id);
    const bValue = getCellValue(b, sort.column_id);
    if (aValue === bValue) continue;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    if (typeof aValue === "number" && typeof bValue === "number") {
      if (sort.direction === "asc") return aValue - bValue;
      else return bValue - aValue;
    } else {
      if (sort.direction === "asc") return String(aValue).localeCompare(String(bValue));
      else return String(bValue).localeCompare(String(aValue));
    }
  }
  return 0;
}

export const tablesRouter = createTRPCRouter({
  /**
   * Get all tables for a specific base
   * Protected query - requires authentication
   */
  getByBaseId: protectedProcedure
    .input(z.object({
      baseId: z.string().uuid("Invalid base ID format"),
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      
      try {
        // Verify base access
        await verifyBaseAccess(supabase, input.baseId, ctx.user.id);

        // Fetch all tables for this base
        const { data, error } = await supabase
          .from('tables')
          .select('id, name')
          .eq('base_id', input.baseId)
          .order('name', { ascending: true });

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch tables: ${(error as Error).message}`,
            cause: error,
          });
        }

        let tables = (data || []).map(table => ({
          id: table.id as string,
          name: table.name as string,
        }));

        // If no tables exist, create a default table
        if (tables.length === 0) {
          const { data: newTableData, error: createError } = await supabase
            .from('tables')
            .insert({
              base_id: input.baseId,
              name: 'Table 1',
            })
            .select('id, name')
            .single();

          if (createError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create default table: ${(createError as Error).message}`,
              cause: createError,
            });
          }

          // Create default columns
          const { data: insertedColumns, error: columnsError } = await supabase
            .from('columns')
            .insert(createDefaultColumns(newTableData.id))
            .select('id, type');

          if (columnsError) {
            await supabase.from('tables').delete().eq('id', newTableData.id);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create default columns: ${(columnsError as Error).message}`,
              cause: columnsError,
            });
          }

          // Create sample rows with fake data (2 rows for demo)
          if (insertedColumns) {
            await createSampleRowsWithData(supabase, newTableData.id, insertedColumns, 2);
          }

          // Create default view for the new table
          const { data: viewData, error: viewError } = await supabase
            .from('views')
            .insert({
              table_id: newTableData.id,
              user_id: ctx.user.id,
              name: "Default View",
              type: "grid",
              hidden_column_ids: [],
            })
            .select('id')
            .single();

          if (viewError || !viewData) {
            await supabase.from('tables').delete().eq('id', newTableData.id);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create default view: ${(viewError as Error).message}`,
              cause: viewError,
            });
          }

          tables = [{
            id: newTableData.id as string,
            name: newTableData.name as string,
          }];
        }

        return tables;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching tables",
          cause: error,
        });
      }
    }),

  create: protectedProcedure
    .input(z.object({
      baseId: z.string().uuid("Invalid base ID format"),
      name: z.string().min(1, "Table name is required").max(100, "Table name too long"),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      try {
        await verifyBaseAccess(supabase, input.baseId, ctx.user.id);

        const { data: tableData, error: tableError } = await supabase
          .from('tables')
          .insert({
            base_id: input.baseId,
            name: input.name,
          })
          .select('id, name')
          .single();

        if (tableError || !tableData) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create table: ${(tableError as Error).message}`,
            cause: tableError,
          });
        }

        const { data: insertedColumns, error: columnsError } = await supabase
          .from('columns')
          .insert(createDefaultColumns(tableData.id))
          .select('id, type');

        if (columnsError) {
          await supabase.from('tables').delete().eq('id', tableData.id);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create default columns: ${(columnsError as Error).message}`,
            cause: columnsError,
          });
        }

        if (insertedColumns) {
          await createSampleRowsWithData(supabase, tableData.id, insertedColumns, 2);
        }

        // Create default view
        const { data: viewData, error: viewError } = await supabase
          .from('views')
          .insert({
            table_id: tableData.id,
            user_id: ctx.user.id,
            name: "Default View",
            type: "grid",
            hidden_column_ids: [],
          })
          .select('id')
          .single();

        if (viewError || !viewData) {
          await supabase.from('tables').delete().eq('id', tableData.id);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create default view: ${(viewError as Error).message}`,
            cause: viewError,
          });
        }

        return {
          id: tableData.id,
          name: tableData.name,
          defaultViewId: viewData.id,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating the table",
          cause: error,
        });
      }
    }),

  resolveDefaultTableView: protectedProcedure
    .input(z.object({
      baseId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      await verifyBaseAccess(supabase, input.baseId, ctx.user.id);

      // Resolve the first table in the base
      const { data: firstTable, error: tableError } = await supabase
        .from('tables')
        .select('id')
        .eq('base_id', input.baseId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (tableError || !firstTable?.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No table found in base' });
      }

      const tableId = firstTable.id;

      // Resolve the default view for the table
      const { data: defaultView, error: viewError } = await supabase
        .from('views')
        .select('id')
        .eq('table_id', tableId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (viewError || !defaultView?.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No view found for table' });
      }

      const viewId = defaultView.id;

      return { tableId, viewId };
    }),

  getTableData: protectedProcedure
  .input(z.object({
    tableId: z.string().uuid(),
    viewId: z.string().uuid()
  }))
  .query(async ({ input, ctx }) => {
    const supabase = ctx.getSupabaseClient();
    const { data, error } = await supabase
      .rpc('fn_get_table_data', {
        p_table_id: input.tableId,
        p_view_id: input.viewId,
        p_user_id: ctx.user.id
      });

    if (error) {
      // custom error handling for rpc func
      if (error.code === 'PGRST100') {
        throw new TRPCError({ code: 'NOT_FOUND', message: error.message });
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }

    return data as { columns: Array<any>; rows: Array<any> };
  }),


  addRow: protectedProcedure
    .input(z.object({
      tableId: z.string().uuid("Invalid table ID format"),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      try {
        // Verify table access
        await verifyTableAccess(supabase, input.tableId, ctx.user.id);

        // Create a new row
        const { data: newRow, error: rowError } = await supabase
          .from('rows')
          .insert({ table_id: input.tableId })
          .select('id')
          .single();

        if (rowError || !newRow) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create row: ${(rowError as Error)?.message}`,
          });
        }

        // Get all columns for this table to create empty cells
        const { data: columns, error: columnsError } = await supabase
          .from('columns')
          .select('id, type')
          .eq('table_id', input.tableId);

        if (columnsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch columns: ${(columnsError as Error).message}`,
          });
        }

        // Create empty cells for each column
        if (columns && columns.length > 0) {
          const cellsToInsert = columns.map((column) => ({
            row_id: newRow.id,
            column_id: column.id,
            value_text: column.type === 'text' ? '' : null,
            value_number: null,
          }));

          const { error: cellsError } = await supabase
            .from('cells')
            .insert(cellsToInsert);

          if (cellsError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create cells: ${(cellsError as Error).message}`,
            });
          }
        }

        return { id: newRow.id };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while adding row",
          cause: error,
        });
      }
    }),

  /**
   * Add a new column to a table
   */
  addColumn: protectedProcedure
    .input(z.object({
      tableId: z.string().uuid("Invalid table ID format"),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      try {
        // Verify table access
        await verifyTableAccess(supabase, input.tableId, ctx.user.id);

        // Get the highest position to set the new column position
        const { data: maxPosition } = await supabase
          .from('columns')
          .select('position')
          .eq('table_id', input.tableId)
          .order('position', { ascending: false })
          .limit(1)
          .single();

        const newPosition = (maxPosition?.position ?? -1) + 1;

        // Create new column
        const { data: newColumn, error: columnError } = await supabase
          .from('columns')
          .insert({
            table_id: input.tableId,
            name: 'New Column',
            type: 'text',
            position: newPosition,
          })
          .select('id')
          .single();

        if (columnError || !newColumn) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create column: ${(columnError as Error)?.message}`,
          });
        }

        // Get all existing rows for this table
        const { data: rows, error: rowsError } = await supabase
          .from('rows')
          .select('id')
          .eq('table_id', input.tableId);

        if (rowsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch rows: ${(rowsError as Error).message}`,
          });
        }

        // Create empty cells for each existing row
        if (rows && rows.length > 0) {
          const cellsToInsert = rows.map((row) => ({
            row_id: row.id,
            column_id: newColumn.id,
            value_text: '',
            value_number: null,
          }));

          const { error: cellsError } = await supabase
            .from('cells')
            .insert(cellsToInsert);

          if (cellsError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to create cells: ${(cellsError as Error).message}`,
            });
          }
        }

        return { id: newColumn.id };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while adding column",
          cause: error,
        });
      }
    }),

  /**
   * Delete a column and all its cells
   */
  deleteColumn: protectedProcedure
    .input(z.object({
      columnId: z.string().uuid("Invalid column ID format"),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      try {
        // Verify column access through table and base ownership
        const { data: columnData, error: columnError } = await supabase
          .from('columns')
          .select(`
            id,
            tables!inner(
              bases!inner(user_id)
            )
          `)
          .eq('id', input.columnId)
          .eq('tables.bases.user_id', ctx.user.id)
          .single();

        if (columnError || !columnData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Column not found or you don't have access to it",
          });
        }

        // Delete all cells for this column first
        const { error: cellsError } = await supabase
          .from('cells')
          .delete()
          .eq('column_id', input.columnId);

        if (cellsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete cells: ${(cellsError as Error).message}`,
          });
        }

        // Delete the column
        const { error: deleteError } = await supabase
          .from('columns')
          .delete()
          .eq('id', input.columnId);

        if (deleteError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete column: ${(deleteError as Error).message}`,
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while deleting column",
          cause: error,
        });
      }
    }),

  /**
   * Update a column's name and/or type
   */
  updateColumn: protectedProcedure
    .input(z.object({
      columnId: z.string().uuid("Invalid column ID format"),
      name: z.string().min(1, "Column name cannot be empty").optional(),
      type: z.enum(["text", "number"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      try {
        // Verify column access through table and base ownership
        const { data: columnData, error: columnError } = await supabase
          .from('columns')
          .select(`
            id,
            type,
            tables!inner(
              bases!inner(user_id)
            )
          `)
          .eq('id', input.columnId)
          .eq('tables.bases.user_id', ctx.user.id)
          .single();

        if (columnError || !columnData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Column not found or you don't have access to it",
          });
        }

        // Build update object
        const updates: { name?: string; type?: string } = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.type !== undefined) updates.type = input.type;

        if (Object.keys(updates).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No updates provided",
          });
        }

        // Update the column
        const { error: updateError } = await supabase
          .from('columns')
          .update(updates)
          .eq('id', input.columnId);

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update column: ${(updateError as Error).message}`,
          });
        }

        // If type changed, we need to update all cells in this column
        if (input.type && input.type !== columnData.type) {
          if (input.type === "text") {
            // Convert number to text - fetch and update individually
            const { data: cells, error: fetchError } = await supabase
              .from('cells')
              .select('id, value_number')
              .eq('column_id', input.columnId)
              .not('value_number', 'is', null);

            if (fetchError) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to fetch cells for conversion: ${(fetchError as Error).message}`,
              });
            }

            if (cells) {
              for (const cell of cells) {
                await supabase
                  .from('cells')
                  .update({ 
                    value_text: cell.value_number?.toString() ?? '',
                    value_number: null 
                  })
                  .eq('id', cell.id);
              }
            }
          } else if (input.type === "number") {
            // Convert text to number (only if it's a valid number)
            const { data: cells, error: fetchError } = await supabase
              .from('cells')
              .select('id, value_text')
              .eq('column_id', input.columnId)
              .not('value_text', 'is', null);

            if (fetchError) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to fetch cells for conversion: ${(fetchError as Error).message}`,
              });
            }

            if (cells) {
              for (const cell of cells) {
                const numValue = parseFloat(cell.value_text ?? '');
                if (!isNaN(numValue)) {
                  await supabase
                    .from('cells')
                    .update({ 
                      value_number: numValue,
                      value_text: null 
                    })
                    .eq('id', cell.id);
                } else {
                  // If can't convert to number, set to 0
                  await supabase
                    .from('cells')
                    .update({ 
                      value_number: 0,
                      value_text: null 
                    })
                    .eq('id', cell.id);
                }
              }
            }
          }
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating column",
          cause: error,
        });
      }
    }),

  /**
   * Update a cell value
   */
  updateCell: protectedProcedure
    .input(z.object({
      cellId: z.string().uuid("Invalid cell ID format"),
      value: z.string(),
      columnType: z.enum(["text", "number"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      try {
        // Verify cell access through table and base ownership
        const { data: cellData, error: cellError } = await supabase
          .from('cells')
          .select(`
            id,
            rows!inner(
              tables!inner(
                bases!inner(user_id)
              )
            )
          `)
          .eq('id', input.cellId)
          .eq('rows.tables.bases.user_id', ctx.user.id)
          .single();

        if (cellError || !cellData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cell not found or you don't have access to it",
          });
        }

        // Parse and validate the value based on column type
        const updateData: { value_text?: string | null; value_number?: number | null } = {};
        
        if (input.columnType === 'text') {
          updateData.value_text = input.value;
          updateData.value_number = null;
        } else if (input.columnType === 'number') {
          updateData.value_text = null;
          if (input.value.trim() === '') {
            updateData.value_number = null;
          } else {
            const numValue = parseFloat(input.value);
            if (isNaN(numValue)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invalid number format",
              });
            }
            updateData.value_number = numValue;
          }
        }

        // Update the cell
        const { error: updateError } = await supabase
          .from('cells')
          .update(updateData)
          .eq('id', input.cellId);

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update cell: ${(updateError as Error).message}`,
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating cell",
          cause: error,
        });
      }
    }),

  /**
   * Add 100 rows to a table with appropriate data
   */
  addRows: protectedProcedure
    .input(z.object({
      tableId: z.string().uuid("Invalid table ID format"),
      count: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      try {
        // Verify table access
        await verifyTableAccess(supabase, input.tableId, ctx.user.id);

        // Get all columns for this table to determine their types and names
        const { data: columns, error: columnsError } = await supabase
          .from('columns')
          .select('id, name, type, position')
          .eq('table_id', input.tableId)
          .order('position', { ascending: true });

        if (columnsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch columns: ${(columnsError as Error).message}`,
          });
        }

        if (!columns || columns.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Table has no columns",
          });
        }

        // Create 100 rows
        const rowsToInsert = Array(input.count).fill(null).map(() => ({ table_id: input.tableId }));
        
        const { data: newRows, error: rowsError } = await supabase
          .from('rows')
          .insert(rowsToInsert)
          .select('id');

        if (rowsError || !newRows) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR", 
            message: `Failed to create rows: ${(rowsError as Error)?.message}`,
          });
        }

        // Generate cells with appropriate data
        const cellsToInsert: { row_id: any; column_id: any; value_text: string | null; value_number: number | null; }[] = [];
        
        for (const row of newRows) {
          for (const column of columns) {
            let value_text: string | null = null;
            let value_number: number | null = null;

            if (column.name === 'Name') {
              value_text = faker.person.fullName();
            } else if (column.name === 'Age') {
              value_number = faker.number.int({ min: 18, max: 69 });
            } else if (column.name === 'Address') {
              value_text = faker.location.streetAddress();
            } else if (column.type === 'text') {
              value_text = faker.lorem.words(3);
            } else if (column.type === 'number') {
              value_number = faker.number.int({ min: 1, max: 1000 });
            }

            cellsToInsert.push({
              row_id: row.id,
              column_id: column.id,
              value_text,
              value_number,
            });
          }
        }

        // Insert all cells
        const { error: cellsError } = await supabase
          .from('cells')
          .insert(cellsToInsert);

        if (cellsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create cells: ${(cellsError as Error).message}`,
          });
        }

        return { 
          success: true, 
          rowsCreated: newRows.length
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while adding a row filter",
          cause: error,
        });
      }
    }),
});
