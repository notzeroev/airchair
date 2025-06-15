import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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
        // First verify the base belongs to the user
        const { data: baseData, error: baseError } = await supabase
          .from('bases')
          .select('id')
          .eq('id', input.baseId)
          .eq('user_id', ctx.user.id)
          .single();

        if (baseError || !baseData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Base not found or you don't have access to it",
          });
        }

        // Fetch all tables for this base
        const { data, error } = await supabase
          .from('tables')
          .select('id, name')
          .eq('base_id', input.baseId)
          .order('name', { ascending: true });

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch tables: ${error.message}`,
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
              message: `Failed to create default table: ${createError.message}`,
              cause: createError,
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

  /**
   * Create a new table for a specific base
   * Protected mutation - requires authentication
   */
  create: protectedProcedure
    .input(z.object({
      baseId: z.string().uuid("Invalid base ID format"),
      name: z.string().min(1, "Table name is required").max(100, "Table name too long"),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      
      try {
        // First verify the base belongs to the user
        const { data: baseData, error: baseError } = await supabase
          .from('bases')
          .select('id')
          .eq('id', input.baseId)
          .eq('user_id', ctx.user.id)
          .single();

        if (baseError || !baseData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Base not found or you don't have access to it",
          });
        }

        // Create the new table
        const { data, error } = await supabase
          .from('tables')
          .insert({
            base_id: input.baseId,
            name: input.name,
          })
          .select('id, name')
          .single();

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create table: ${error.message}`,
            cause: error,
          });
        }

        return {
          id: data.id as string,
          name: data.name as string,
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
});
