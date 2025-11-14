import { NextResponse } from 'next/server';
import { getAllQueues, initializeQueues } from '@/lib/queues';

// GET /api/queues - Get all queue statistics
export async function GET() {
  try {
    const queues = await getAllQueues();
    const stats = {};

    for (const [name, queue] of Object.entries(queues)) {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(), 
          queue.getCompleted(),
          queue.getFailed()
        ]);

        stats[name] = {
          name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          total: waiting.length + active.length + completed.length + failed.length
        };
      } catch (error) {
        console.error(`Error getting stats for queue ${name}:`, error);
        stats[name] = {
          name,
          error: error.message,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0
        };
      }
    }

    return NextResponse.json({ 
      success: true, 
      queues: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/queues - Initialize queues and workers
export async function POST() {
  try {
    await initializeQueues();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Queues initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing queues:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
