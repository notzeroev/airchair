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
});
