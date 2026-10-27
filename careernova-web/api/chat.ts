import { handleChat } from "./_chat.js";

/** Vercel Function: POST /api/chat. Set GROQ_API_KEY in the project's environment variables. */
export function POST(request: Request) {
  return handleChat(request, process.env);
}
