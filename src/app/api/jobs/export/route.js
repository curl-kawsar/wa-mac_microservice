import { NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queues';

// POST /api/jobs/export - Add a data export job
export async function POST(request) {
  try {
    const { format, filters = {}, userId, fileName } = await request.json();

    // Validate required fields
    if (!format) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: format' },
        { status: 400 }
      );
    }

    // Validate export formats
    const validFormats = ['csv', 'json', 'xlsx', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid format. Valid formats: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the data export queue
    const exportQueue = await getQueue(QUEUE_NAMES.DATA_EXPORT);

    // Estimate processing time based on format (for job priority)
    const processingTimeMap = {
      'csv': 2000,
      'json': 1500,
      'xlsx': 4000,
      'pdf': 8000
    };

    const jobOptions = {
      removeOnComplete: 20, // Keep fewer export jobs as they can be large
      removeOnFail: 10,
      attempts: 2, // Fewer retry attempts for export jobs
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      // Higher priority for smaller/faster exports
      priority: 10 - (processingTimeMap[format.toLowerCase()] / 1000)
    };

    // Add export job to queue
    const job = await exportQueue.add('export-data', {
      format: format.toLowerCase(),
      filters,
      userId,
      fileName: fileName || `export-${Date.now()}.${format.toLowerCase()}`,
      estimatedDuration: processingTimeMap[format.toLowerCase()],
      requestedAt: new Date().toISOString()
    }, jobOptions);

    console.log(`📊 Data export job queued: ${job.id} (${format} format)`);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        queueName: QUEUE_NAMES.DATA_EXPORT,
        type: 'export-data',
        data: {
          format: format.toLowerCase(),
          filters,
          fileName: fileName || `export-${Date.now()}.${format.toLowerCase()}`,
          estimatedDuration: `${processingTimeMap[format.toLowerCase()] / 1000} seconds`
        },
        createdAt: new Date(job.timestamp).toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding data export job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
