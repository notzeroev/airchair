import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getRandomColor } from "@/lib/colors/colors";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const basesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      name: z.string().min(1, "Base name is required").max(100, "Base name too long"),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      
      try {
        const { data, error } = await supabase
          .from('bases')
          .insert({
            name: input.name,
            user_id: ctx.user.id,
            color: getRandomColor()
          })
          .select('id, name, color')
          .single();

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create base: ${error.message}`,
            cause: error,
          });
        }

        return {
          id: data.id as number,
          name: data.name as string,
          color: data.color as number,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating the base",
          cause: error,
        });
      }
    }),

  /**
   * Get all bases for the authenticated user
   * Protected query - requires authentication
   */
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const supabase = ctx.getSupabaseClient();
      
      try {
        // Fetch all bases for the authenticated user
        const { data, error } = await supabase
          .from('bases')
          .select('id, name, color')
          .eq('user_id', ctx.user.id)
          .order('name', { ascending: true });

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch bases: ${error.message}`,
            cause: error,
          });
        }

        // Ensure proper typing by mapping the data
        const bases = (data || []).map(base => ({
          id: base.id as number,
          name: base.name as string,
          color: base.color as number,
        }));

        return bases;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching bases",
          cause: error,
        });
      }
    }),

    /**
     * Get a base by ID
     * Protected query - requires authentication
     */
    getById: protectedProcedure
      .input(z.object({ baseId: z.string().uuid("Invalid base ID format") }))
      .query(async ({ input, ctx }) => {
        const supabase = ctx.getSupabaseClient();
        try {
          const { data, error } = await supabase
            .from('bases')
            .select('id, name, color')
            .eq('id', input.baseId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch base: ${error.message}`,
              cause: error,
            });
          }

          return {
            id: data.id as number,
            name: data.name as string,
            color: data.color as number,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred while fetching the base",
            cause: error,
          });
        }
      }),

  /**
   * Delete a base by ID (and all its tables, columns, rows, and cells)
   * Protected mutation - requires authentication
   */
  delete: protectedProcedure
    .input(z.object({ baseId: z.string().uuid("Invalid base ID format") }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        // Verify base ownership
        const { data: base, error: baseError } = await supabase
          .from('bases')
          .select('id')
          .eq('id', input.baseId)
          .eq('user_id', ctx.user.id)
          .single();
        if (baseError || !base) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Base not found or you don't have access to it",
          });
        }
        // Delete all related tables, columns, rows, and cells
        // 1. Get all tables for this base
        const { data: tables } = await supabase
          .from('tables')
          .select('id')
          .eq('base_id', input.baseId);
        if (tables && tables.length > 0) {
          const tableIds = tables.map(t => t.id);
          // 2. Get all columns for these tables
          const { data: columns } = await supabase
            .from('columns')
            .select('id')
            .in('table_id', tableIds);
          if (columns && columns.length > 0) {
            const columnIds = columns.map(c => c.id);
            // 3. Delete all cells for these columns
            await supabase.from('cells').delete().in('column_id', columnIds);
            // 4. Delete columns
            await supabase.from('columns').delete().in('id', columnIds);
          }
          // 5. Get all rows for these tables
          const { data: rows } = await supabase
            .from('rows')
            .select('id')
            .in('table_id', tableIds);
          if (rows && rows.length > 0) {
            const rowIds = rows.map(r => r.id);
            // 6. Delete all cells for these rows (if any left)
            await supabase.from('cells').delete().in('row_id', rowIds);
            // 7. Delete rows
            await supabase.from('rows').delete().in('id', rowIds);
          }
          // 8. Delete tables
          await supabase.from('tables').delete().in('id', tableIds);
        }
        // 9. Delete the base
        const { error: deleteError } = await supabase
          .from('bases')
          .delete()
          .eq('id', input.baseId);
        if (deleteError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete base: ${deleteError.message}`,
          });
        }
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while deleting the base",
          cause: error,
        });
      }
    }),
});
