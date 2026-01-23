// Discover environment to determine API_BASE
const ENV_MODE = import.meta.env.MODE || "production";
const API_BASE = (ENV_MODE === "development" ? "http://localhost:8000/api" :
	(import.meta.env.VITE_API_BASE_URL as string | undefined)
).replace(/\/$/, "");

// Hardcoded environment variables
export const API_BASE_URL = API_BASE;
export const N8N_CHAT_URL = "https://n8n.enlaight.ai/webhook/<code>/chat";
export const N8N_SUPPORT_ASSISTANT_URL = "https://n8n.enlaight.ai/webhook/<code>/chat";
