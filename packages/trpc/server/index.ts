import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { projectsRouter } from "./routes/projects/route";
import { sourcesRouter } from "./routes/sources/route";
import { chatRouter } from "./routes/chat/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  projects: projectsRouter,
  sources: sourcesRouter,
  chat: chatRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
