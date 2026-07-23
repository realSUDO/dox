import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { projectsRouter } from "./routes/projects/route";
import { sourcesRouter } from "./routes/sources/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  projects: projectsRouter,
  sources: sourcesRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
