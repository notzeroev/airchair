import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const viewsRouter = createTRPCRouter({
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