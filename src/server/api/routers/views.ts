import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const viewsRouter = createTRPCRouter({
  createView: protectedProcedure
    .input(
      z.object({
        tableId: z.string().uuid(),
        name: z.string().min(1).max(255),
        type: z.string().min(1).max(255)
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: viewData, error: viewError } = await supabase
          .from("views")
          .insert({
            table_id: input.tableId,
            user_id: ctx.user.id,
            name: input.name,
            type: input.type,
            hidden_column_ids: [],
          })
          .select("id, name, type")
          .single();

        if (viewError || !viewData) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create view: ${(viewError as Error).message}`,
            cause: viewError,
          });
        }

        return { viewId: viewData.id, name: viewData.name, type: viewData.type };
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
        name: z.string().min(1).max(255).optional(),
        columnIds: z.array(z.string().uuid()).optional(),
        query: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const updateData: any = {};
        if (input.name !== undefined) {
          updateData.name = input.name;
        }
        if (input.columnIds !== undefined) {
          updateData.hidden_column_ids = input.columnIds;
        }
        if (input.query !== undefined) {
          updateData.query = input.query;
        }

        const { data: updatedView, error: updateError } = await supabase
          .from('views')
          .update(updateData)
          .eq('id', input.viewId)
          .select('id, name, hidden_column_ids, query')
          .single();
        if (updateError || !updatedView) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update view: ${(updateError as Error).message}`,
            cause: updateError,
          });
        }
        return { 
          viewId: updatedView.id, 
          name: updatedView.name,
          hiddenColumnIds: updatedView.hidden_column_ids || [],
          query: updatedView.query || ""
        };
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

  getHiddenColumns: protectedProcedure
    .input(z.object({
      viewId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: view, error: viewError } = await supabase
          .from('views')
          .select('hidden_column_ids')
          .eq('id', input.viewId)
          .single();

        if (viewError || !view) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch view: ${(viewError as Error).message}`,
            cause: viewError,
          });
        }

        return { hiddenColumnIds: view.hidden_column_ids || [] };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching hidden columns",
          cause: error,
        });
      }
    }),

  getViews: protectedProcedure
    .input(z.object({
      tableId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      try {
        const { data: views, error: viewsError } = await supabase
          .from("views")
          .select("id, name, type")
          .eq("table_id", input.tableId)
          .order("created_at", { ascending: true });

        if (viewsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch views: ${(viewsError as Error).message}`,
            cause: viewsError,
          });
        }

        return (views).map(view => ({
          id: view.id as string,
          name: view.name as string,
          type: view.type as string
        }));
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching views",
          cause: error,
        });
      }
    }),

  getViewById: protectedProcedure
    .input(z.object({
      viewId: z.string().uuid()
    }))
    .query(async ({ input, ctx }) => {
      const supabase = ctx.getSupabaseClient();
      const { data: view, error } = await supabase
        .from('views')
        .select('id, name, type, hidden_column_ids, query')
        .eq('id', input.viewId)
        .single();
      if (error || !view) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch view: ${(error as Error)?.message}`,
          cause: error,
        });
      }
      return {
        id: view.id,
        name: view.name,
        type: view.type,
        hiddenColumnIds: view.hidden_column_ids || [],
        query: view.query || ""
      };
    }),
});