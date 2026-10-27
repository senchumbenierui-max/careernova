import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * Serves api/chat.ts during `npm run dev`, so the chat works locally without the Vercel CLI.
 * Reads GROQ_API_KEY from .env.local. Non-VITE_ variables never reach the browser bundle.
 */
function apiDev(): Plugin {
  return {
    name: "careernova-api-dev",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv("development", process.cwd(), "");
      server.middlewares.use("/api/chat", async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
          const request = new Request(`http://${req.headers.host}/api/chat`, {
            method: req.method,
            headers,
            body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
          });
          const { handleChat } = await server.ssrLoadModule("/api/_chat.ts");
          const response: Response = await handleChat(request, env);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) for await (const chunk of response.body) res.write(chunk);
          res.end();
        } catch (error) {
          server.config.logger.error(String(error));
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDev()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
