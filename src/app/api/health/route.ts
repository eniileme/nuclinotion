import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
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

export async function GET() {
  try {
    console.log('=== HEALTH CHECK WITH LOGGING ===');
    await writeLog('=== HEALTH CHECK WITH LOGGING ===');
    
    // Try to read existing logs
    let existingLogs = '';
    try {
      existingLogs = await readFile(LOG_FILE, 'utf-8');
    } catch (error) {
      existingLogs = 'No existing logs found';
    }
    
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'API routes are working',
      logging: {
        logFileExists: existingLogs !== 'No existing logs found',
        logCount: existingLogs.split('\n').filter(line => line.trim()).length,
        recentLogs: existingLogs.split('\n').filter(line => line.trim()).slice(-5)
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    await writeLog(`Health check failed: ${error}`);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
