import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
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
    await writeLog('=== LOG VIEWER ACCESSED ===');
    
    // Try to read the log file
    try {
      const logContent = await readFile(LOG_FILE, 'utf-8');
      const logs = logContent.split('\n').filter(line => line.trim());
      
      return NextResponse.json({
        success: true,
        logCount: logs.length,
        logs: logs.slice(-50), // Last 50 log entries
        fullLog: logContent
      });
    } catch (readError) {
      await writeLog(`Failed to read log file: ${readError}`);
      
      return NextResponse.json({
        success: false,
        error: 'No logs found yet',
        message: 'Try uploading a file first to generate logs'
      });
    }
  } catch (error) {
    await writeLog(`Log viewer error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to read logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;
    
    await writeLog(`MANUAL LOG: ${message}`);
    
    return NextResponse.json({
      success: true,
      message: 'Log written successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to write log' },
      { status: 500 }
    );
  }
}

// Export the writeLog function for use in other files
export { writeLog };
