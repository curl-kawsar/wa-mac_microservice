// Startup script to initialize BullMQ workers and queues
import { initializeQueues, initializeWorkers } from './queues.js';

let initialized = false;

export const initializeBullMQ = async () => {
  if (initialized) {
    console.log('📋 BullMQ already initialized, skipping...');
    return;
  }

  try {
    console.log('🚀 Starting BullMQ initialization...');
    
    // Initialize queues
    console.log('📋 Initializing queues...');
    await initializeQueues();
    
    // Initialize workers
    console.log('⚡ Starting workers...');
    await initializeWorkers();
    
    initialized = true;
    console.log('✅ BullMQ initialization completed successfully!');
    
    // Graceful shutdown handler
    const gracefulShutdown = async () => {
      console.log('🛑 Shutting down BullMQ workers gracefully...');
      const { cleanup } = await import('./queues.js');
      await cleanup();
      process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Failed to initialize BullMQ:', error);
    throw error;
  }
};

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  // Delay initialization to allow database connections to establish
  setTimeout(() => {
    initializeBullMQ().catch(console.error);
  }, 2000);
}
