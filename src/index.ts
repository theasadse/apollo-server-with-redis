import "dotenv/config";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { getRedisClient, disconnectRedis } from "./utils/redis";

const PORT = process.env.PORT || 4000;
const app = express();

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

    // Apollo GraphQL middleware
    app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req }) => ({ req }),
      })
    );

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "Server is running" });
    });

    // Start Express server
    await new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
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
