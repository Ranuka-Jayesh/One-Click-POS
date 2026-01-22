import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { connectToDatabase } from './config/database.js';
import adminRoutes from './routes/admin.js';
import menuItemsRoutes from './routes/menuItems.js';
import ordersRoutes from './routes/orders.js';
import { initializeWebSocket } from './utils/websocket.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket server
initializeWebSocket(httpServer);

// Middleware
app.use(cors());

// Body parsers - but skip for multipart/form-data (handled by multer)
// Note: express.json() and express.urlencoded() automatically skip multipart/form-data
// but we'll be explicit to avoid any issues
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next(); // Skip body parsing for file uploads - multer will handle it
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next(); // Skip body parsing for file uploads - multer will handle it
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Serve uploaded images as static files
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('📁 Serving static files from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/menu-items', menuItemsRoutes);
app.use('/api/orders', ordersRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Handle multer errors
  if (err.name === 'MulterError' || err.message.includes('Only image files')) {
    return res.status(400).json({ 
      success: false,
      error: err.message || 'File upload error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'File upload failed'
    });
  }
  
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');

    // Start HTTP server (with WebSocket support)
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server is ready for connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
