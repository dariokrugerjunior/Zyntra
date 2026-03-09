import "express-async-errors";
import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "../../config/env";
import { logger } from "../../shared/utils/logger";
import { errorHandler } from "./middlewares/error-handler";
import { authMiddleware } from "./middlewares/auth";
import { healthRouter } from "../../modules/health/routes";
import { internalRouter } from "../../modules/internal/routes";
import { authRouter } from "../../modules/auth/routes";
import { sessionsRouter } from "../../modules/sessions/routes";
import { messagesRouter } from "../../modules/messages/routes";
import { webhooksRouter } from "../../modules/webhooks/routes";
import { openApiDocument } from "../../config/openapi";

export function buildServer() {
  const app = express();
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );
  app.use(express.json({ limit: "15mb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      }
    })
  );

  app.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(healthRouter);
  app.use(internalRouter);

  app.use(authMiddleware);
  app.use(authRouter);
  app.use(sessionsRouter);
  app.use(messagesRouter);
  app.use(webhooksRouter);

  app.use(errorHandler);

  return app;
}
