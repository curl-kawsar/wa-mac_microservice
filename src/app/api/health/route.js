import { NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import getRedisConnection from '@/lib/redis';

// GET /api/health - Health check endpoint for monitoring
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };

  let overallStatus = 'healthy';

  // Check Database Connection
  try {
    await dbConnect();
    checks.services.database = {
      status: 'healthy',
      type: 'mongodb',
      message: 'Connected successfully'
    };
  } catch (error) {
    checks.services.database = {
      status: 'unhealthy',
      type: 'mongodb',
      message: error.message
    };
    overallStatus = 'unhealthy';
  }

  // Check Redis Connection
  try {
    const redis = await getRedisConnection();
    await redis.ping();
    checks.services.redis = {
      status: 'healthy',
      type: 'redis',
      message: 'Connected successfully'
    };
  } catch (error) {
    checks.services.redis = {
      status: 'unhealthy',
      type: 'redis', 
      message: error.message
    };
    overallStatus = 'unhealthy';
  }

  // Check Queue Status (optional detailed check)
  try {
    const { getAllQueues } = await import('@/lib/queues');
    const queues = await getAllQueues();
    
    const queueStats = {};
    for (const [name, queue] of Object.entries(queues)) {
      try {
        const [waiting, active] = await Promise.all([
          queue.getWaiting(),
          queue.getActive()
        ]);
        
        queueStats[name] = {
          waiting: waiting.length,
          active: active.length,
          status: 'operational'
        };
      } catch (queueError) {
        queueStats[name] = {
          status: 'error',
          message: queueError.message
        };
      }
    }
    
    checks.services.queues = {
      status: 'healthy',
      type: 'bullmq',
      queues: queueStats
    };
  } catch (error) {
    checks.services.queues = {
      status: 'degraded',
      type: 'bullmq',
      message: 'Queue system not fully initialized'
    };
    // Don't mark overall as unhealthy for queue issues
  }

  // Update overall status
  checks.status = overallStatus;

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'healthy' ? 200 : 503;

  return NextResponse.json(checks, { status: httpStatus });
}

// Simple ping endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
