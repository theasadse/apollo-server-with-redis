import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { getRedisClient, disconnectRedis } from "./utils/redis";

const PORT = process.env.PORT || 4000;
const INSTANCE_ID = process.env.INSTANCE_ID || "default";
const app = express();

// Request tracking middleware
const requestTracker = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `${INSTANCE_ID}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add request metadata to response header
  res.setHeader("X-Instance-ID", INSTANCE_ID);
  res.setHeader("X-Request-ID", requestId);

  // Log incoming request
  console.log(
    `[${new Date().toISOString()}] [${INSTANCE_ID}] ${req.method} ${req.path} - Request ID: ${requestId}`
  );

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] [${INSTANCE_ID}] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`
    );
  });

  next();
};

async function startServer() {
  try {
    // Connect to Redis
    await getRedisClient();

    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    // Start Apollo Server
    await server.start();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(requestTracker);

    // Apollo GraphQL middleware
    app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req }) => ({
          req,
          instanceId: INSTANCE_ID,
        }),
      })
    );

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "Server is running",
        instance: INSTANCE_ID,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Start Express server
    await new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        console.log(`🚀 [${INSTANCE_ID}] Server running at http://localhost:${PORT}/graphql`);
        console.log(`📊 Load Balancer Access: http://localhost:8080/lb-status`);
        console.log(`📊 GraphQL through LB: http://localhost:8080/graphql`);
        resolve();
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await disconnectRedis();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await disconnectRedis();
  process.exit(0);
});

startServer();
