import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // In Docker Compose, frontend container must use service name 'backend' to reach backend
  // Since environment variables may not be available when vite.config.ts is evaluated,
  // we'll use a simple check: if we can't detect localhost, assume Docker
  // For Docker: use service name 'backend'
  // For local dev: use 'localhost'
  
  // Check environment variables (may not be available at config time)
  const dockerEnv = process.env.DOCKER_ENV;
  const viteDocker = process.env.VITE_DOCKER;
  
  // For Docker: use service name 'backend'
  // For local dev: use 'localhost'
  const backendUrl = (dockerEnv === 'true' || viteDocker === 'true') 
    ? 'http://backend:3000' 
    : 'http://localhost:3000'; // Use localhost for local development
  
  console.log('[Vite Config] Backend proxy target:', backendUrl);
  
  return {
    server: {
      host: "::",
      port: 8080,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
        ws: true, // WebSocket support
      },
      "/uploads": {
        target: backendUrl,
        changeOrigin: true,
        // Configure proxy to handle static file serving
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Proxy] Static file request:', req.method, req.url);
          });
          
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[Proxy] Static file response:', proxyRes.statusCode, req.url);
          });
          
          proxy.on('error', (err, _req, res) => {
            console.error('[Proxy Error]', err.message);
            if (res && !res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false,
                error: 'Proxy connection failed', 
                message: err.message 
              }));
            }
          });
        },
      },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
