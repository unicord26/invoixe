import "./lib/env"; // must be first — loads .env before Prisma/Supabase read it
import "reflect-metadata"; // Nest DI reads design:paramtypes from here
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";

const PORT = Number(process.env.API_PORT ?? 5000);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  // Security headers (CSP is left to the Next app; this is a JSON API).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

  // CORS: restrict to the known frontend origin(s). Set FRONTEND_ORIGINS (comma-
  // separated) in production; defaults cover local dev.
  const allowedOrigins = (process.env.FRONTEND_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
      // Allow same-origin / non-browser (curl, server-to-server) requests with no Origin.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  });

  // Cap request bodies — bulk import is the largest legitimate payload.
  app.useBodyParser("json", { limit: "2mb" });

  // Blanket rate limit (generous; blunts abuse without hindering normal use).
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "rate_limited" },
    })
  );

  // Routes keep their /api prefix so the client needs no changes.
  app.setGlobalPrefix("api");

  app.enableShutdownHooks();
  await app.listen(PORT);
  console.log(`✓ Invoixe API listening on http://localhost:${PORT}`);
}

bootstrap().catch((err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n✗ Port ${PORT} is already in use — an old API process is still holding it.\n` +
        `  Run \`npm run dev:clean\` from the repo root to free it, then start again.\n`
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
