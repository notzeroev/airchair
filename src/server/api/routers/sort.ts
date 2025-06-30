import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const sortsRouter = createTRPCRouter({
  createSort: protectedProcedure
    .input(
      z.object({
        viewId: z.string().uuid(),
        columnId: z.string().uuid(),
        direction: z.enum(["asc", "desc"]),
        order_index: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: sortData, error: sortError } = await supabase
          .from("sorts")
          .insert({
            view_id: input.viewId,
            column_id: input.columnId,
            direction: input.direction,
            order_index: input.order_index ?? null,
          })
          .select("id")
          .single();

        if (sortError || !sortData) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create sort: ${(sortError as Error).message}`,
            cause: sortError,
          });
        }
        return sortData;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating the sort",
          cause: error,
        });
      }
    }),

  updateSort: protectedProcedure
    .input(
      z.object({
        sortId: z.string().uuid(),
        columnId: z.string().uuid().optional(),
        direction: z.enum(["asc", "desc"]).optional(),
        order_index: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const updateData: Record<string, any> = {};
        if (input.columnId) updateData.column_id = input.columnId;
        if (input.direction !== undefined) updateData.direction = input.direction;
        if (input.order_index !== undefined) updateData.order_index = input.order_index;
        const { data, error } = await supabase
          .from("sorts")
          .update(updateData)
          .eq("id", input.sortId)
          .select()
          .single();
        if (error || !data) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update sort: ${(error as Error).message}`,
            cause: error,
          });
        }
        return data;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating the sort",
          cause: error,
        });
      }
    }),

  deleteSort: protectedProcedure
    .input(z.object({ sortId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { error } = await supabase
          .from("sorts")
          .delete()
          .eq("id", input.sortId);
        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete sort: ${(error as Error).message}`,
            cause: error,
          });
        }
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while deleting the sort",
          cause: error,
        });
      }
    }),

  getSorts: protectedProcedure
    .input(z.object({
      viewId: z.string().uuid("Invalid view ID format")
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: sorts, error: sortsError } = await supabase
          .from('sorts')
          .select('id, column_id, direction, order_index')
          .eq('view_id', input.viewId);

        if (sortsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch sorts: ${(sortsError as Error).message}`,
          });
        }

        return (sorts).map(sort => ({
          id: sort.id as string,
          columnId: sort.column_id as string,
          direction: sort.direction as "asc" | "desc",
          order_index: sort.order_index ?? null as number | null,
        }));
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching sorts",
          cause: error,
        });
      }
    }),
});
