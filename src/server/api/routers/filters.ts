import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const filtersRouter = createTRPCRouter({
  createFilter: protectedProcedure
    .input(
      z.object({
        viewId: z.string().uuid(),
        columnId: z.string().uuid(),
        operator: z.string(),
        value_text: z.string().nullable().optional().default(null),
        value_number: z.number().nullable().optional().default(null),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: filterData, error: filterError } = await supabase
          .from("filters")
          .insert({
            view_id: input.viewId,
            column_id: input.columnId,
            operator: input.operator,
            value_text: input.value_text,
            value_number: input.value_number,
          })
          .select("id")
          .single();

          if (filterError || !filterData) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create filter: ${(filterError as Error).message}`,
            cause: filterError,
          });
        }

      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating the filter",
          cause: error,
        });
      }
    }),

  updateFilter: protectedProcedure
    .input(
      z.object({
        filterId: z.string().uuid(),
        columnId: z.string().uuid().optional(),
        operator: z.string().optional(),
        value_text: z.string().optional(),
        value_number: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const updateData: Record<string, any> = {};
        if (input.columnId) updateData.column_id = input.columnId;
        if (input.operator !== undefined) updateData.operator = input.operator;
        if (input.value_text !== undefined) updateData.value_text = input.value_text;
        if (input.value_number !== undefined) updateData.value_number = input.value_number;
        const { data, error } = await supabase
          .from("filters")
          .update(updateData)
          .eq("id", input.filterId)
          .select()
          .single();
        if (error || !data) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update filter: ${(error as Error).message}`,
            cause: error,
          });
        }
        return data;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating the filter",
          cause: error,
        });
      }
    }),

  deleteFilter: protectedProcedure
    .input(z.object({ filterId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { error } = await supabase
          .from("filters")
          .delete()
          .eq("id", input.filterId);
        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete filter: ${(error as Error).message}`,
            cause: error,
          });
        }
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while deleting the filter",
          cause: error,
        });
      }
    }),
    
    getFilters: protectedProcedure
        .input(z.object({
          viewId: z.string().uuid("Invalid view ID format")
        }))
        .query(async ({ input, ctx }) => {
          const supabase = ctx.getSupabaseClient();
    
          try {
            const { data: filters, error: filtersError } = await supabase
              .from('filters')
              .select('id, column_id, operator, value_text, value_number')
              .eq('view_id', input.viewId);

            if (filtersError) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to fetch filters: ${(filtersError as Error).message}`,
              });
            }

            return (filters).map(filter => ({
              id: filter.id as string,
              columnId: filter.column_id as string,
              operator: filter.operator as string,
              value_text: filter.value_text || null as string | null,
              value_number: filter.value_number || null as number | null,
            }));
          } catch (error) {
            if (error instanceof TRPCError) {
              throw error;
            }
            
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An unexpected error occurred while fetching table data",
              cause: error,
            });
          }
        }),
});
