import { NextResponse } from 'next/server';
import { getAllQueues } from '@/lib/queues';

// GET /api/admin/queues - Queue information endpoint
export async function GET() {
  try {
    const queues = await getAllQueues();
    
    // Return queue information for dashboard
    const queueInfo = {};
    
    for (const [name, queue] of Object.entries(queues)) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(0, 9), // Get last 10 completed
          queue.getFailed(0, 9),     // Get last 10 failed
          queue.getDelayed()
        ]);

        queueInfo[name] = {
          name,
          counts: {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            total: waiting.length + active.length + completed.length + failed.length + delayed.length
          },
          recentJobs: {
            completed: completed.map(job => ({
              id: job.id,
              name: job.name,
              data: job.data,
              finishedOn: job.finishedOn,
              processedOn: job.processedOn,
              returnValue: job.returnvalue
            })),
            failed: failed.map(job => ({
              id: job.id,
              name: job.name,
              data: job.data,
              failedReason: job.failedReason,
              finishedOn: job.finishedOn
            }))
          }
        };
      } catch (error) {
        console.error(`Error getting queue info for ${name}:`, error);
        queueInfo[name] = {
          name,
          error: error.message,
          counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 }
        };
      }
    }

    return NextResponse.json({
      success: true,
      queues: queueInfo,
      dashboardUrl: 'http://localhost:3001', // BullMQ Board container
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error accessing Bull Board:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
