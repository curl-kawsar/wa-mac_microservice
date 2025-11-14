import { NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queues';

// POST /api/jobs/email - Add an email job
export async function POST(request) {
  try {
    const { to, subject, body, template, priority = 'normal' } = await request.json();

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Get the email queue
    const emailQueue = await getQueue(QUEUE_NAMES.EMAIL);

    // Set priority level
    const priorityMap = {
      low: 1,
      normal: 5,
      high: 10,
      urgent: 15
    };

    const jobOptions = {
      priority: priorityMap[priority] || 5,
      delay: priority === 'low' ? 5000 : 0, // Low priority emails delayed by 5 seconds
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      }
    };

    // Add email job to queue
    const job = await emailQueue.add('send-email', {
      to,
      subject,
      body: body || `Default email body for: ${subject}`,
      template: template || 'default',
      priority,
      requestedAt: new Date().toISOString()
    }, jobOptions);

    console.log(`📧 Email job queued: ${job.id} (${priority} priority)`);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        queueName: QUEUE_NAMES.EMAIL,
        type: 'send-email',
        priority,
        data: {
          to,
          subject,
          template: template || 'default'
        },
        createdAt: new Date(job.timestamp).toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding email job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
