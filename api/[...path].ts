import { createApp } from "../server/app";

// Catch-all Vercel Function for every /api/* route. The Express application
// owns Discord OAuth2, tRPC and GitHub Actions callback routes.
export default createApp();
