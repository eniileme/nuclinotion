import path from 'path';
import {
  ParsedNote, 
  Section, 
  JobStatus, 
  JobResult, 
  ProcessingOptions, 
  RewrittenNote,
  AssetIndex
} from './types';
import { 
  TFIDFVectorizer, 
  KMeans, 
  calculateOptimalK, 
  createClusters 
} from './clustering';
import {
  parseMarkdownFile, 
  rewriteInternalLinks, 
  rewriteImageLinks, 
  generateSectionIndex
} from './md';
import {
  createTempDir,
  extractZip,
  createZip,
  buildAssetIndex,
  findAsset,
  getMarkdownFiles,
  readFileContent,
  writeFileContent,
  copyFile,
  generateJobId,
  saveJobMetadata
} from './fsx';

export class ProcessingPipeline {
  private jobId: string;
  private tempDir!: string;
  private status: JobStatus;
  private updateStatusCallback?: (status: JobStatus) => void;

  constructor(jobId?: string) {
    this.jobId = jobId || generateJobId();
    this.status = {
      id: this.jobId,
      status: 'uploading',
      progress: 0,
      message: 'Initializing...',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  setStatusCallback(callback: (status: JobStatus) => void) {
    this.updateStatusCallback = callback;
  }

  private async updateStatus(
    status: JobStatus['status'], 
    progress: number, 
    message: string, 
    error?: string
  ) {
    this.status = {
      ...this.status,
      status,
      progress,
      message,
      error
    };
    
    if (this.updateStatusCallback) {
      this.updateStatusCallback(this.status);
    }
  }

  /**
   * Main processing pipeline
   */
  async process(
    notesZipPath: string,
    assetsZipPath: string | null,
    options: ProcessingOptions
  ): Promise<JobResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Setup and extract files
      await this.updateStatus('scanning', 10, 'Setting up temporary directories...');
      this.tempDir = await createTempDir(this.jobId);
      
      const notesDir = path.join(this.tempDir, 'notes');
      const assetsDir = path.join(this.tempDir, 'assets');
      
      await this.updateStatus('scanning', 20, 'Extracting notes...');
      await extractZip(notesZipPath, notesDir);
      
      if (assetsZipPath) {
        await this.updateStatus('scanning', 30, 'Extracting assets...');
        await extractZip(assetsZipPath, assetsDir);
      }
      
      // Step 2: Parse markdown files
      await this.updateStatus('scanning', 40, 'Scanning markdown files...');
      const markdownFiles = await getMarkdownFiles(notesDir);
      
      if (markdownFiles.length === 0) {
        throw new Error('No markdown files found in the uploaded archive');
      }
      
      const notes: ParsedNote[] = [];
      for (const filePath of markdownFiles) {
        const content = await readFileContent(filePath);
        const relativePath = path.relative(notesDir, filePath);
        const note = parseMarkdownFile(relativePath, content);
        notes.push(note);
      }
      
      // Step 3: Build asset index
      await this.updateStatus('scanning', 50, 'Indexing assets...');
      const assetIndex = await buildAssetIndex(assetsDir);
      
      // Step 4: Clustering
      await this.updateStatus('clustering', 60, 'Analyzing content...');
      const sections = await this.createSections(notes, options);
      
      // Step 5: Rewrite links and images
      await this.updateStatus('rewriting', 70, 'Rewriting links and images...');
      const rewrittenNotes = await this.rewriteContent(notes, sections, assetIndex);
      
      // Step 6: Generate output structure
      await this.updateStatus('packaging', 80, 'Generating output structure...');
      const outputDir = path.join(this.tempDir, 'notion_ready');
      await this.generateOutputStructure(rewrittenNotes, sections, assetIndex, outputDir);
      
      // Step 7: Create report
      await this.updateStatus('packaging', 90, 'Generating report...');
      const report = await this.generateReport(notes, sections, assetIndex, startTime, options);
      await writeFileContent(path.join(outputDir, 'RUN_REPORT.md'), report);
      
      // Step 8: Create ZIP
      await this.updateStatus('packaging', 95, 'Creating download package...');
      const zipPath = path.join(this.tempDir, 'notion_ready.zip');
      await createZip(outputDir, zipPath);
      
      // Step 9: Save job metadata
      const result: JobResult = {
        sections,
        totalNotes: notes.length,
        totalAssets: assetIndex.byFilename.size,
        unresolvedLinks: 0, // Will be calculated in report
        unresolvedImages: 0, // Will be calculated in report
        reportContent: report,
        zipPath
      };
      
      await saveJobMetadata(this.jobId, { result, options });
      
      await this.updateStatus('ready', 100, 'Processing complete!');
      
      return result;
      
    } catch (error) {
      await this.updateStatus('error', 0, 'Processing failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Create sections based on clustering strategy
   */
  private async createSections(notes: ParsedNote[], options: ProcessingOptions): Promise<Section[]> {
    let sections: Section[];
    
    switch (options.groupingStrategy) {
      case 'headings':
        sections = this.groupByHeadings(notes);
        break;
      case 'tags':
        sections = this.groupByTags(notes);
        break;
      case 'cluster':
      default:
        sections = await this.groupByClustering(notes, options.clusteringK);
        break;
    }
    
    return sections;
  }

  /**
   * Group notes by first heading
   */
  private groupByHeadings(notes: ParsedNote[]): Section[] {
    const sectionsMap = new Map<string, ParsedNote[]>();
    
    for (const note of notes) {
      const firstHeading = note.headings.find(h => h.level === 1);
      const sectionName = firstHeading ? firstHeading.text : 'Untitled';
      
      if (!sectionsMap.has(sectionName)) {
        sectionsMap.set(sectionName, []);
      }
      sectionsMap.get(sectionName)!.push(note);
    }
    
    return Array.from(sectionsMap.entries()).map(([label, sectionNotes], index) => ({
      id: `section_${index}`,
      label: this.sanitizeSectionLabel(label),
      notes: sectionNotes,
      indexContent: generateSectionIndex(sectionNotes)
    }));
  }

  /**
   * Group notes by first tag
   */
  private groupByTags(notes: ParsedNote[]): Section[] {
    const sectionsMap = new Map<string, ParsedNote[]>();
    
    for (const note of notes) {
      const firstTag = note.tags.length > 0 ? note.tags[0] : 'Untagged';
      
      if (!sectionsMap.has(firstTag)) {
        sectionsMap.set(firstTag, []);
      }
      sectionsMap.get(firstTag)!.push(note);
    }
    
    return Array.from(sectionsMap.entries()).map(([label, sectionNotes], index) => ({
      id: `section_${index}`,
      label: this.sanitizeSectionLabel(label),
      notes: sectionNotes,
      indexContent: generateSectionIndex(sectionNotes)
    }));
  }

  /**
   * Group notes by clustering
   */
  private async groupByClustering(notes: ParsedNote[], k: number | 'auto'): Promise<Section[]> {
    if (notes.length === 0) {
      return [];
    }
    
    const actualK = k === 'auto' ? calculateOptimalK(notes) : k;
    
    // Vectorize notes
    const vectorizer = new TFIDFVectorizer();
    vectorizer.fit(notes);
    const vectors = vectorizer.transformAll(notes);
    
    // Cluster
    const kmeans = new KMeans();
    const result = kmeans.fit(vectors, actualK);
    
    // Create clusters
    const vocabulary = Array.from(new Set(vectors.flatMap(v => Object.keys(v))));
    const clusters = createClusters(notes, result, vocabulary);
    
    return clusters.map((cluster, index) => ({
      id: cluster.id,
      label: `Section_${String(index + 1).padStart(2, '0')}_${cluster.label}`,
      notes: cluster.notes,
      indexContent: generateSectionIndex(cluster.notes)
    }));
  }

  /**
   * Rewrite content with new links and images
   */
  private async rewriteContent(
    notes: ParsedNote[], 
    sections: Section[], 
    assetIndex: AssetIndex
  ): Promise<RewrittenNote[]> {
    const rewrittenNotes: RewrittenNote[] = [];
    
    // Build note index for link resolution
    const noteIndex = new Map<string, ParsedNote>();
    for (const note of notes) {
      noteIndex.set(note.filename, note);
    }
    
    // Build link mapping
    const linkMapping = new Map<string, string>();
    for (const section of sections) {
      for (const note of section.notes) {
        const newPath = path.join(section.label, note.filename);
        linkMapping.set(note.filename, newPath);
        
        // Also map by title for wiki links
        linkMapping.set(note.title, newPath);
      }
    }
    
    // Build image mapping
    const imageMapping = new Map<string, string>();
    for (const section of sections) {
      for (const note of section.notes) {
        for (const image of note.images) {
          const asset = findAsset(image.src, note.noteId, assetIndex);
          if (asset) {
            const assetDir = note.noteId ? `assets/${note.noteId}` : 'assets/unassigned';
            const newPath = path.join(assetDir, path.basename(asset.path));
            imageMapping.set(image.src, newPath);
          }
        }
      }
    }
    
    // Rewrite each note
    for (const section of sections) {
      for (const note of section.notes) {
        const newPath = path.join(section.label, note.filename);
        
        // Rewrite links
        const { content: contentWithLinks, rewrittenCount: linksRewritten } = 
          rewriteInternalLinks(note.content, newPath, linkMapping);
        
        // Rewrite images
        const { content: finalContent, rewrittenCount: imagesRewritten } = 
          rewriteImageLinks(contentWithLinks, imageMapping);
        
        rewrittenNotes.push({
          originalNote: note,
          newPath,
          newContent: finalContent,
          rewrittenLinks: linksRewritten,
          rewrittenImages: imagesRewritten
        });
      }
    }
    
    return rewrittenNotes;
  }

  /**
   * Generate output directory structure
   */
  private async generateOutputStructure(
    rewrittenNotes: RewrittenNote[],
    sections: Section[],
    assetIndex: AssetIndex,
    outputDir: string
  ): Promise<void> {
    // Create section directories and copy notes
    for (const section of sections) {
      const sectionDir = path.join(outputDir, section.label);
      await writeFileContent(path.join(sectionDir, 'index.md'), section.indexContent);
      
      for (const rewrittenNote of rewrittenNotes) {
        if (rewrittenNote.newPath.startsWith(section.label)) {
          await writeFileContent(
            path.join(outputDir, rewrittenNote.newPath),
            rewrittenNote.newContent
          );
        }
      }
    }
    
    // Copy assets
    const assetsOutputDir = path.join(outputDir, 'assets');
    
    // Copy note-specific assets
    for (const [noteId, assets] of assetIndex.byNoteId) {
      const noteAssetsDir = path.join(assetsOutputDir, noteId);
      for (const asset of assets) {
        await copyFile(asset.path, path.join(noteAssetsDir, path.basename(asset.path)));
      }
    }
    
    // Copy unassigned assets
    const unassignedDir = path.join(assetsOutputDir, 'unassigned');
    for (const asset of assetIndex.unassigned) {
      await copyFile(asset.path, path.join(unassignedDir, path.basename(asset.path)));
    }
  }

  /**
   * Generate processing report
   */
  private async generateReport(
    notes: ParsedNote[],
    sections: Section[],
    assetIndex: AssetIndex,
    startTime: number,
    options: ProcessingOptions
  ): Promise<string> {
    const processingTime = Date.now() - startTime;
    const totalAssets = assetIndex.byFilename.size;
    
    const lines = [
      '# Notion Prep Processing Report',
      '',
      `**Generated:** ${new Date().toISOString()}`,
      `**Processing Time:** ${(processingTime / 1000).toFixed(2)} seconds`,
      '',
      '## Summary',
      '',
      `- **Total Notes:** ${notes.length}`,
      `- **Total Assets:** ${totalAssets}`,
      `- **Sections Created:** ${sections.length}`,
      `- **Grouping Strategy:** ${options.groupingStrategy}`,
      '',
      '## Sections',
      ''
    ];
    
    for (const section of sections) {
      lines.push(`### ${section.label}`);
      lines.push(`- **Notes:** ${section.notes.length}`);
      lines.push(`- **Sample Notes:** ${section.notes.slice(0, 3).map(n => n.title).join(', ')}`);
      lines.push('');
    }
    
    lines.push('## Assets');
    lines.push('');
    lines.push(`- **Note-specific Assets:** ${assetIndex.byNoteId.size} folders`);
    lines.push(`- **Unassigned Assets:** ${assetIndex.unassigned.length} files`);
    lines.push('');
    
    if (options.groupingStrategy === 'cluster') {
      lines.push('## Clustering Information');
      lines.push('');
      lines.push(`- **K Value:** ${options.clusteringK}`);
      lines.push('');
    }
    
    lines.push('## Next Steps');
    lines.push('');
    lines.push('1. Download the `notion_ready.zip` file');
    lines.push('2. Extract it to your desired location');
    lines.push('3. Import the sections into Notion');
    lines.push('4. Note: Internal links may need manual adjustment in Notion');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Sanitize section label for filesystem
   */
  private sanitizeSectionLabel(label: string): string {
    return label
      .replace(/[^A-Za-z0-9\s_-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
      .trim() || 'Untitled';
  }

  /**
   * Get current job status
   */
  getStatus(): JobStatus {
    return this.status;
  }

  /**
   * Get job ID
   */
  getJobId(): string {
    return this.jobId;
  }
}
