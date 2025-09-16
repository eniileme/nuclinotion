import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG LOGS TEST ===');
    console.log('This is a test log message');
    console.log('Current timestamp:', new Date().toISOString());
    console.log('Environment:', process.env.NODE_ENV);
    console.log('=== END DEBUG LOGS TEST ===');
    
    return NextResponse.json({
      message: 'Debug logs test completed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Debug logs test failed:', error);
    return NextResponse.json(
      { error: 'Debug logs test failed' },
      { status: 500 }
    );
  }
}
