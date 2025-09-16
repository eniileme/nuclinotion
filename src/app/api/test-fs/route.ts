import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir, stat } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const testDir = '/tmp/test';
    const testFile = path.join(testDir, 'test.txt');
    const testContent = 'Hello from Vercel filesystem!';
    
    console.log('Testing filesystem access...');
    console.log(`Creating directory: ${testDir}`);
    
    // Test directory creation
    await mkdir(testDir, { recursive: true });
    console.log('Directory created successfully');
    
    // Test file writing
    console.log(`Writing test file: ${testFile}`);
    await writeFile(testFile, testContent);
    console.log('File written successfully');
    
    // Test file reading
    console.log('Reading test file...');
    const readContent = await readFile(testFile, 'utf-8');
    console.log(`Read content: ${readContent}`);
    
    // Test file stats
    const stats = await stat(testFile);
    console.log(`File stats: size=${stats.size}, created=${stats.birthtime}`);
    
    return NextResponse.json({
      success: true,
      message: 'Filesystem test passed',
      testDir,
      testFile,
      content: readContent,
      fileSize: stats.size
    });
    
  } catch (error) {
    console.error('Filesystem test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
