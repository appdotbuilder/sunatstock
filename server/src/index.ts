
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema,
  createMedicalItemInputSchema,
  updateMedicalItemInputSchema,
  restockItemInputSchema,
  createProcedureInputSchema,
  stockFilterInputSchema,
  dateRangeInputSchema
} from './schema';

// Import handlers
import { loginUser } from './handlers/auth_login';
import { createMedicalItem } from './handlers/create_medical_item';
import { getMedicalItems } from './handlers/get_medical_items';
import { updateMedicalItem } from './handlers/update_medical_item';
import { restockItem } from './handlers/restock_item';
import { createProcedure } from './handlers/create_procedure';
import { getProcedures } from './handlers/get_procedures';
import { getLowStockItems } from './handlers/get_low_stock_items';
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { getUsageReport } from './handlers/get_usage_report';
import { getStockHistory } from './handlers/get_stock_history';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Medical item management
  createMedicalItem: publicProcedure
    .input(createMedicalItemInputSchema)
    .mutation(({ input }) => createMedicalItem(input)),

  getMedicalItems: publicProcedure
    .input(stockFilterInputSchema.optional())
    .query(({ input }) => getMedicalItems(input)),

  updateMedicalItem: publicProcedure
    .input(updateMedicalItemInputSchema)
    .mutation(({ input }) => updateMedicalItem(input)),

  restockItem: publicProcedure
    .input(restockItemInputSchema)
    .mutation(({ input }) => restockItem(input)),

  // Stock monitoring
  getLowStockItems: publicProcedure
    .query(() => getLowStockItems()),

  getStockHistory: publicProcedure
    .input(z.object({ item_id: z.number() }))
    .query(({ input }) => getStockHistory(input.item_id)),

  // Procedure management  
  createProcedure: publicProcedure
    .input(createProcedureInputSchema)
    .mutation(({ input }) => createProcedure(input)),

  getProcedures: publicProcedure
    .input(dateRangeInputSchema.optional())
    .query(({ input }) => getProcedures(input)),

  // Dashboard and reports
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  getUsageReport: publicProcedure
    .input(dateRangeInputSchema)
    .query(({ input }) => getUsageReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`SunatStock TRPC server listening at port: ${port}`);
}

start();
