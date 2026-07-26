import { Request, Response, NextFunction } from "express";
import auth from "basic-auth";

export function basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const credentials = auth(req);
  const expectedEnv = process.env.METRICS_BASIC_AUTH;
  if (!expectedEnv) {
    res.status(500).send("Metrics authentication is not configured.");
    return;
  }
  const [expectedUser, expectedPass] = expectedEnv.split(":");

  if (!credentials || credentials.name !== expectedUser || credentials.pass !== expectedPass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Metrics"');
    res.status(401).send("Access denied");
    return;
  }

  next();
}
