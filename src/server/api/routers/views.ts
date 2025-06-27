import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const viewsRouter = createTRPCRouter({

  createView: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: viewData, error: viewError } = await supabase
          .from("views")
          .insert({
            table_id: input.tableId,
            name: input.name,
          })
          .select("id, name")
          .single();

        if (viewError || !viewData) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create view: ${(viewError as Error).message}`,
            cause: viewError,
          });
        }

        return { viewId: viewData.id, name: viewData.name };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while creating the view",
          cause: error,
        });
      }
    }),

  updateView: protectedProcedure
    .input(
      z.object({
        viewId: z.string().uuid(),
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: updatedView, error: updateError } = await supabase
          .from('views')
          .update({ name: input.name })
          .eq('id', input.viewId)
          .select('id, name')
          .single();
        if (updateError || !updatedView) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update view: ${(updateError as Error).message}`,
            cause: updateError,
          });
        }
        return { viewId: updatedView.id, name: updatedView.name };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while updating the view",
          cause: error,
        });
      }
    }),

  deleteView: protectedProcedure
    .input(z.object({
      viewId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { error: deleteError } = await supabase
          .from('views')
          .delete()
          .eq('id', input.viewId);

        if (deleteError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete view: ${(deleteError as Error).message}`,
            cause: deleteError,
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while deleting the view",
          cause: error,
        });
      }
    }),

  resolveDefaultView: protectedProcedure
    .input(z.object({
      tableId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();

      // Resolve the default view for the table
      const { data: defaultView, error: viewError } = await supabase
        .from('views')
        .select('id')
        .eq('table_id', input.tableId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (viewError || !defaultView?.id) {
        throw new Error('No view found for table');
      }

      const viewId = defaultView.id;

      return { viewId };
    }),

    getColumns: protectedProcedure
    .input(z.object({
      tableId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      // Resolve the default view for the table
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

      return { columns: columns || [], };
    }),
});