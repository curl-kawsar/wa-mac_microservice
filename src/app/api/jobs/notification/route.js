import { NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queues';

// POST /api/jobs/notification - Add a notification job
export async function POST(request) {
  try {
    const { 
      userId, 
      type, 
      message, 
      channel = 'in_app', 
      priority = 'normal',
      scheduledFor,
      metadata = {} 
    } = await request.json();

    // Validate required fields
    if (!userId || !type || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, type, message' },
        { status: 400 }
      );
    }

    // Validate notification channels
    const validChannels = ['email', 'sms', 'push', 'in_app', 'webhook'];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { success: false, error: `Invalid channel. Valid channels: ${validChannels.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate notification types
    const validTypes = [
      'welcome',
      'verification',
      'reminder',
      'alert',
      'update',
      'promotion',
      'system'
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the notifications queue
    const notificationQueue = await getQueue(QUEUE_NAMES.NOTIFICATIONS);

    // Set priority and delay
    const priorityMap = {
      low: 1,
      normal: 5,
      high: 10,
      urgent: 15
    };

    let delay = 0;
    if (scheduledFor) {
      const scheduledTime = new Date(scheduledFor);
      const now = new Date();
      if (scheduledTime > now) {
        delay = scheduledTime.getTime() - now.getTime();
      }
    }

    const jobOptions = {
      priority: priorityMap[priority] || 5,
      delay,
      removeOnComplete: 200, // Keep more notification jobs for audit
      removeOnFail: 50,
      attempts: channel === 'email' ? 3 : 2, // More retries for email
      backoff: {
        type: 'exponential',
        delay: channel === 'sms' ? 10000 : 3000, // Longer delays for SMS
      }
    };

    // Add notification job to queue
    const job = await notificationQueue.add('send-notification', {
      userId,
      type,
      message,
      channel,
      priority,
      metadata,
      scheduledFor: scheduledFor || null,
      requestedAt: new Date().toISOString()
    }, jobOptions);

    console.log(`🔔 Notification job queued: ${job.id} (${type} via ${channel} for user ${userId})`);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        queueName: QUEUE_NAMES.NOTIFICATIONS,
        type: 'send-notification',
        data: {
          userId,
          type,
          channel,
          priority,
          scheduledFor: scheduledFor || 'immediate',
          message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        },
        delay: delay > 0 ? `${Math.round(delay / 1000)} seconds` : 'none',
        createdAt: new Date(job.timestamp).toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding notification job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
