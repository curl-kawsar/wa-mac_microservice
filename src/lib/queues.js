import { Queue, Worker } from 'bullmq';
import getRedisConnection from './redis.js';

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  USER_PROCESSING: 'user-processing-queue',
  DATA_EXPORT: 'data-export-queue',
  NOTIFICATIONS: 'notifications-queue',
};

// Connection options for BullMQ
const getConnectionOptions = async () => {
  const redis = await getRedisConnection();
  return {
    host: redis.options.host,
    port: redis.options.port,
    password: redis.options.password,
  };
};

// Queue instances
let queues = {};
let workers = {};

// Initialize queues
export const initializeQueues = async () => {
  const connection = await getConnectionOptions();

  // Email Queue
  queues[QUEUE_NAMES.EMAIL] = new Queue(QUEUE_NAMES.EMAIL, { connection });
  
  // User Processing Queue
  queues[QUEUE_NAMES.USER_PROCESSING] = new Queue(QUEUE_NAMES.USER_PROCESSING, { connection });
  
  // Data Export Queue
  queues[QUEUE_NAMES.DATA_EXPORT] = new Queue(QUEUE_NAMES.DATA_EXPORT, { connection });
  
  // Notifications Queue
  queues[QUEUE_NAMES.NOTIFICATIONS] = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection });

  console.log('✅ All queues initialized successfully');
  return queues;
};

// Get a specific queue
export const getQueue = async (queueName) => {
  if (!queues[queueName]) {
    await initializeQueues();
  }
  return queues[queueName];
};

// Get all queues
export const getAllQueues = async () => {
  if (Object.keys(queues).length === 0) {
    await initializeQueues();
  }
  return queues;
};

// Initialize workers
export const initializeWorkers = async () => {
  const connection = await getConnectionOptions();

  // Email Worker
  workers[QUEUE_NAMES.EMAIL] = new Worker(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      console.log(`📧 Processing email job: ${job.id}`);
      const { to, subject, body } = job.data;
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Email sent to ${to}: ${subject}`);
      return { success: true, sentAt: new Date().toISOString() };
    },
    { connection }
  );

  // User Processing Worker
  workers[QUEUE_NAMES.USER_PROCESSING] = new Worker(
    QUEUE_NAMES.USER_PROCESSING,
    async (job) => {
      console.log(`👤 Processing user job: ${job.id}`);
      const { userId, action } = job.data;
      
      // Simulate user processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(`✅ User ${userId} ${action} completed`);
      return { success: true, processedAt: new Date().toISOString() };
    },
    { connection }
  );

  // Data Export Worker
  workers[QUEUE_NAMES.DATA_EXPORT] = new Worker(
    QUEUE_NAMES.DATA_EXPORT,
    async (job) => {
      console.log(`📊 Processing data export job: ${job.id}`);
      const { format, filters } = job.data;
      
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log(`✅ Data exported in ${format} format`);
      return { 
        success: true, 
        exportedAt: new Date().toISOString(),
        downloadUrl: `/exports/data-${Date.now()}.${format}` 
      };
    },
    { connection }
  );

  // Notifications Worker
  workers[QUEUE_NAMES.NOTIFICATIONS] = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      console.log(`🔔 Processing notification job: ${job.id}`);
      const { userId, type, message } = job.data;
      
      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`✅ Notification sent to user ${userId}: ${message}`);
      return { success: true, sentAt: new Date().toISOString() };
    },
    { connection }
  );

  // Add event listeners for workers
  Object.values(workers).forEach((worker) => {
    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });
  });

  console.log('✅ All workers initialized successfully');
  return workers;
};

// Get workers
export const getWorkers = () => workers;

// Cleanup function
export const cleanup = async () => {
  // Close all workers
  await Promise.all(Object.values(workers).map(worker => worker.close()));
  
  // Close all queues
  await Promise.all(Object.values(queues).map(queue => queue.close()));
  
  console.log('✅ All queues and workers closed');
};
