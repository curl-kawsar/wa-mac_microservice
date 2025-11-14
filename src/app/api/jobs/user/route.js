import { NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queues';

// POST /api/jobs/user - Add a user processing job
export async function POST(request) {
  try {
    const { userId, action, metadata = {}, delay = 0 } = await request.json();

    // Validate required fields
    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, action' },
        { status: 400 }
      );
    }

    // Validate action types
    const validActions = [
      'welcome_email',
      'profile_verification', 
      'account_cleanup',
      'data_backup',
      'preferences_update'
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Valid actions: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the user processing queue
    const userQueue = await getQueue(QUEUE_NAMES.USER_PROCESSING);

    const jobOptions = {
      delay: parseInt(delay) || 0,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      }
    };

    // Add user processing job to queue
    const job = await userQueue.add('process-user', {
      userId,
      action,
      metadata,
      requestedAt: new Date().toISOString()
    }, jobOptions);

    console.log(`👤 User processing job queued: ${job.id} (${action} for user ${userId})`);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        queueName: QUEUE_NAMES.USER_PROCESSING,
        type: 'process-user',
        data: {
          userId,
          action,
          metadata
        },
        delay: delay || 0,
        createdAt: new Date(job.timestamp).toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding user processing job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
