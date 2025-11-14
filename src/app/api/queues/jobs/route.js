import { NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queues';

// POST /api/queues/jobs - Add a job to a queue
export async function POST(request) {
  try {
    const { queueName, jobType, data, options = {} } = await request.json();

    // Validate queue name
    if (!Object.values(QUEUE_NAMES).includes(queueName)) {
      return NextResponse.json(
        { success: false, error: `Invalid queue name: ${queueName}` },
        { status: 400 }
      );
    }

    // Get the queue
    const queue = await getQueue(queueName);

    // Default job options
    const jobOptions = {
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50,      // Keep last 50 failed jobs
      attempts: 3,           // Retry failed jobs up to 3 times
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options
    };

    // Add job to queue
    const job = await queue.add(jobType, data, jobOptions);

    console.log(`✅ Job added to ${queueName}: ${job.id}`);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        queueName,
        createdAt: new Date(job.timestamp).toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding job to queue:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
