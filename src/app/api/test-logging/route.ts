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
    console.log('=== TEST LOGGING START ===');
    await writeLog('=== TEST LOGGING START ===');
    
    console.log('Testing console.log output');
    await writeLog('Testing file-based logging');
    
    console.log('=== TEST LOGGING END ===');
    await writeLog('=== TEST LOGGING END ===');
    
    return NextResponse.json({
      success: true,
      message: 'Logging test completed',
      timestamp: new Date().toISOString(),
      instructions: [
        '1. Check Vercel Dashboard Functions tab for console.log output',
        '2. Visit /api/view-logs to see file-based logs',
        '3. Look for "=== TEST LOGGING START ===" in both places'
      ]
    });
  } catch (error) {
    console.error('Test logging failed:', error);
    await writeLog(`Test logging failed: ${error}`);
    return NextResponse.json(
      { error: 'Test logging failed' },
      { status: 500 }
    );
  }
}
