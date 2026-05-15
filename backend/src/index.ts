import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// GLOBAL ERROR HANDLERS
process.on('uncaughtException', (error) => {
  console.error('!!! [CRITICAL] UNCAUGHT EXCEPTION !!!');
  console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! [CRITICAL] UNHANDLED REJECTION !!!');
  console.error('Promise:', promise, 'Reason:', reason);
});

// REQUEST LOGGING
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`>>> [${new Date().toISOString()}] ${req.method} ${req.url} START`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`<<< [${new Date().toISOString()}] ${req.method} ${req.url} END (${res.statusCode}) - ${duration}ms`);
  });
  
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', pid: process.pid, time: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is alive' });
});

// Import routes
import authRoutes from './routes/auth.routes';
import adAccountRoutes from './routes/adAccount.routes';
import duplicationRoutes from './routes/duplication.routes';
import templateRoutes from './routes/template.routes';
import draftRoutes from './routes/draft.routes';

app.use('/api/auth', authRoutes);
app.use('/api/adaccounts', adAccountRoutes);
app.use('/api/duplicate', duplicationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/drafts', draftRoutes);

// Catch-all for 404s
app.use((req, res) => {
  console.warn(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found', path: req.url });
});

console.log(`[DEBUG] Attempting to start server on port ${PORT} (PID: ${process.pid})...`);

const server = app.listen(PORT);

server.on('listening', () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  console.log('==================================================');
  console.log(`  SERVER IS LISTENING ON ${bind}`);
  console.log(`  PROCESS PID: ${process.pid}`);
  console.log(`  TIMESTAMP: ${new Date().toISOString()}`);
  console.log('==================================================');
});

server.on('error', (err: any) => {
  console.error('!!! SERVER ERROR EVENT !!!');
  if (err.code === 'EADDRINUSE') {
    console.error(`!!! Port ${PORT} is already in use. !!!`);
    process.exit(1);
  } else {
    console.error(err);
  }
});

server.on('close', () => {
  console.warn('!!! SERVER CLOSED !!!');
});

export { prisma };
