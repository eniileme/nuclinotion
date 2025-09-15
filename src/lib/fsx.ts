import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import unzipper from 'unzipper';
import { AssetFile, AssetIndex } from './types';

/**
 * Create a temporary directory for a job
 */
export async function createTempDir(jobId: string): Promise<string> {
  const tempDir = path.join('/tmp', 'jobs', jobId);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(jobId: string): Promise<void> {
  const tempDir = path.join('/tmp', 'jobs', jobId);
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup temp dir for job ${jobId}:`, error);
  }
}

/**
 * Clean up all expired jobs
 */
export async function cleanupExpiredJobs(): Promise<number> {
  const jobsDir = path.join('/tmp', 'jobs');
  let cleanedCount = 0;
  
  try {
    const entries = await fs.readdir(jobsDir, { withFileTypes: true });
    const now = Date.now();
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const jobDir = path.join(jobsDir, entry.name);
        const metaPath = path.join(jobDir, 'meta.json');
        
        try {
          const metaContent = await fs.readFile(metaPath, 'utf-8');
          const meta = JSON.parse(metaContent);
          
          if (meta.expiresAt && now > new Date(meta.expiresAt).getTime()) {
            await fs.rm(jobDir, { recursive: true, force: true });
            cleanedCount++;
          }
        } catch (error) {
          // If meta.json doesn't exist or is invalid, clean up anyway
          await fs.rm(jobDir, { recursive: true, force: true });
          cleanedCount++;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup expired jobs:', error);
  }
  
  return cleanedCount;
}

/**
 * Extract ZIP file to directory
 */
export async function extractZip(zipPath: string, extractTo: string): Promise<void> {
  await fs.mkdir(extractTo, { recursive: true });
  
  const zipBuffer = await fs.readFile(zipPath);
  const zip = await unzipper.Open.buffer(zipBuffer);
  
  for (const file of zip.files) {
    if (file.type === 'File') {
      const filePath = path.join(extractTo, file.path);
      const dirPath = path.dirname(filePath);
      
      await fs.mkdir(dirPath, { recursive: true });
      
      const content = await file.buffer();
      await fs.writeFile(filePath, content);
    }
  }
}

/**
 * Create ZIP file from directory
 */
export async function createZip(sourceDir: string, zipPath: string): Promise<void> {
  const zip = new JSZip();
  
  async function addDirectoryToZip(dirPath: string, zipPath: string = '') {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const zipEntryPath = path.join(zipPath, entry.name);
      
      if (entry.isDirectory()) {
        await addDirectoryToZip(fullPath, zipEntryPath);
      } else {
        const content = await fs.readFile(fullPath);
        zip.file(zipEntryPath, content);
      }
    }
  }
  
  await addDirectoryToZip(sourceDir);
  
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(zipPath, zipBuffer);
}

/**
 * Build asset index from directory
 */
export async function buildAssetIndex(assetsDir: string): Promise<AssetIndex> {
  const index: AssetIndex = {
    byFilename: new Map(),
    byNoteId: new Map(),
    unassigned: []
  };
  
  if (!await directoryExists(assetsDir)) {
    return index;
  }
  
  await scanDirectory(assetsDir, '', index);
  return index;
}

/**
 * Recursively scan directory for assets
 */
async function scanDirectory(
  dirPath: string, 
  relativePath: string, 
  index: AssetIndex
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const entryRelativePath = path.join(relativePath, entry.name);
    
    if (entry.isDirectory()) {
      // Check if directory name looks like a UUID (note ID)
      const isUuidDir = /^[a-f0-9]{6,}$/i.test(entry.name);
      
      if (isUuidDir) {
        // This is a note-specific asset directory
        await scanDirectory(fullPath, '', index);
      } else {
        // Regular subdirectory
        await scanDirectory(fullPath, entryRelativePath, index);
      }
    } else {
      // It's a file
      const stats = await fs.stat(fullPath);
      const assetFile: AssetFile = {
        filename: entry.name.toLowerCase(),
        path: fullPath,
        size: stats.size
      };
      
      // Check if we're in a UUID directory (note-specific)
      const pathParts = relativePath.split(path.sep);
      const parentDir = pathParts[pathParts.length - 1];
      
      if (/^[a-f0-9]{6,}$/i.test(parentDir)) {
        assetFile.noteId = parentDir;
        
        if (!index.byNoteId.has(parentDir)) {
          index.byNoteId.set(parentDir, []);
        }
        index.byNoteId.get(parentDir)!.push(assetFile);
      } else {
        index.unassigned.push(assetFile);
      }
      
      // Add to filename index
      index.byFilename.set(entry.name.toLowerCase(), assetFile);
    }
  }
}

/**
 * Find asset by filename
 */
export function findAsset(
  filename: string, 
  noteId: string | undefined, 
  index: AssetIndex
): AssetFile | null {
  const lowerFilename = filename.toLowerCase();
  
  // First try to find in note-specific directory
  if (noteId && index.byNoteId.has(noteId)) {
    const noteAssets = index.byNoteId.get(noteId)!;
    const asset = noteAssets.find(a => a.filename === lowerFilename);
    if (asset) return asset;
  }
  
  // Then try global filename index
  return index.byFilename.get(lowerFilename) || null;
}

/**
 * Check if directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Get all markdown files in directory recursively
 */
export async function getMarkdownFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!await directoryExists(dirPath)) {
    return files;
  }
  
  await scanForMarkdown(dirPath, files);
  return files;
}

/**
 * Recursively scan for markdown files
 */
async function scanForMarkdown(dirPath: string, files: string[]): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      await scanForMarkdown(fullPath, files);
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }
}

/**
 * Read file content safely
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Write file content safely
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Copy file from source to destination
 */
export async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  try {
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(sourcePath, destPath);
  } catch (error) {
    throw new Error(`Failed to copy file from ${sourcePath} to ${destPath}: ${error}`);
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Generate unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save job metadata
 */
export async function saveJobMetadata(
  jobId: string, 
  metadata: Record<string, unknown>, 
  ttlHours: number = 24
): Promise<void> {
  const tempDir = path.join('/tmp', 'jobs', jobId);
  const metaPath = path.join(tempDir, 'meta.json');
  
  const meta = {
    ...metadata,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
  };
  
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

/**
 * Load job metadata
 */
export async function loadJobMetadata(jobId: string): Promise<Record<string, unknown> | null> {
  const metaPath = path.join('/tmp', 'jobs', jobId, 'meta.json');
  
  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
