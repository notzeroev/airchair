import { basesRouter } from "./routers/bases";
import { tablesRouter } from "./routers/tables";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { viewsRouter } from "./routers/views";
import { filtersRouter } from "./routers/filters";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  bases: basesRouter,
  tables: tablesRouter,
  views: viewsRouter,
  filters: filtersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
