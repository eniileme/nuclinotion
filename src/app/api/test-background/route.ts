import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const LOGS_DIR = '/tmp/logs';
const LOG_FILE = path.join(LOGS_DIR, 'app.log');

async function writeLog(message: string) {
  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    await writeFile(LOG_FILE, logEntry, { flag: 'a' });
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== TEST BACKGROUND PROCESSING ===');
    await writeLog('=== TEST BACKGROUND PROCESSING ===');

    // Simulate background processing
    const testJobId = 'test_' + Date.now();
    
    console.log(`Starting background test for job: ${testJobId}`);
    await writeLog(`Starting background test for job: ${testJobId}`);

    // Simulate processing steps
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      console.log(`Test job ${testJobId}: Progress ${i}%`);
      await writeLog(`Test job ${testJobId}: Progress ${i}%`);
    }

    console.log(`Background test completed for job: ${testJobId}`);
    await writeLog(`Background test completed for job: ${testJobId}`);

    return NextResponse.json({
      success: true,
      message: 'Background processing test completed',
      jobId: testJobId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Background test failed:', error);
    await writeLog(`Background test failed: ${error}`);
    return NextResponse.json(
      { error: 'Background test failed' },
      { status: 500 }
    );
  }
}
