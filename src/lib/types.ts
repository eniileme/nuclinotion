export interface ParsedNote {
  id: string;
  filename: string;
  title: string;
  content: string;
  normalizedContent: string;
  tags: string[];
  headings: Heading[];
  links: Link[];
  images: Image[];
  noteId?: string; // trailing hex id from filename
  frontMatter?: Record<string, unknown>;
}

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface Link {
  text: string;
  href: string;
  isInternal: boolean;
  isWikiLink: boolean;
  line: number;
}

export interface Image {
  alt: string;
  src: string;
  line: number;
}

export interface AssetFile {
  filename: string;
  path: string;
  noteId?: string; // if in UUID subfolder
  size: number;
}

export interface Cluster {
  id: string;
  label: string;
  notes: ParsedNote[];
  topTerms: string[];
  centroid: number[];
}

export interface Section {
  id: string;
  label: string;
  notes: ParsedNote[];
  indexContent: string;
}

export interface JobStatus {
  id: string;
  status: 'uploading' | 'scanning' | 'clustering' | 'rewriting' | 'packaging' | 'ready' | 'error';
  progress: number;
  message: string;
  error?: string;
  result?: JobResult;
  createdAt: Date;
  expiresAt: Date;
}

export interface JobResult {
  sections: Section[];
  totalNotes: number;
  totalAssets: number;
  unresolvedLinks: number;
  unresolvedImages: number;
  reportContent: string;
  zipPath: string;
}

export interface ProcessingOptions {
  clusteringK: number | 'auto';
  groupingStrategy: 'cluster' | 'headings' | 'tags';
}

export interface UploadData {
  notesZip?: File;
  assetsZip?: File;
  options: ProcessingOptions;
}

export interface TFIDFVector {
  [term: string]: number;
}

export interface KMeansResult {
  clusters: number[][];
  centroids: number[][];
  labels: number[];
  inertia: number;
}

export interface AssetIndex {
  byFilename: Map<string, AssetFile>;
  byNoteId: Map<string, AssetFile[]>;
  unassigned: AssetFile[];
}

export interface RewrittenNote {
  originalNote: ParsedNote;
  newPath: string;
  newContent: string;
  rewrittenLinks: number;
  rewrittenImages: number;
}

export interface ProcessingReport {
  totalNotes: number;
  totalAssets: number;
  sections: Array<{
    label: string;
    noteCount: number;
    sampleNotes: string[];
  }>;
  unresolvedLinks: Array<{
    note: string;
    link: string;
    reason: string;
  }>;
  unresolvedImages: Array<{
    note: string;
    image: string;
    reason: string;
  }>;
  processingTime: number;
  clusteringInfo?: {
    k: number;
    strategy: string;
    topTerms: string[];
  };
}
