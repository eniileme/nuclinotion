import { ParsedNote, TFIDFVector, KMeansResult, Cluster } from './types';

export class TFIDFVectorizer {
  private vocabulary: Set<string> = new Set();
  private idf: Map<string, number> = new Map();
  private maxFeatures = 50000;

  constructor() {}

  /**
   * Normalize text for vectorization
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract unigrams and bigrams from text
   */
  private extractTokens(text: string): string[] {
    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter(w => w.length > 2);
    
    const unigrams = words;
    const bigrams: string[] = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]}_${words[i + 1]}`);
    }
    
    return [...unigrams, ...bigrams];
  }

  /**
   * Build vocabulary from all documents
   */
  fit(notes: ParsedNote[]): void {
    const termCounts = new Map<string, number>();
    
    for (const note of notes) {
      const tokens = this.extractTokens(note.normalizedContent);
      const uniqueTokens = new Set(tokens);
      
      for (const token of uniqueTokens) {
        termCounts.set(token, (termCounts.get(token) || 0) + 1);
      }
    }
    
    // Keep top terms by frequency
    const sortedTerms = Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxFeatures)
      .map(([term]) => term);
    
    this.vocabulary = new Set(sortedTerms);
    
    // Calculate IDF
    const totalDocs = notes.length;
    for (const term of this.vocabulary) {
      let docCount = 0;
      for (const note of notes) {
        const tokens = this.extractTokens(note.normalizedContent);
        if (tokens.includes(term)) {
          docCount++;
        }
      }
      this.idf.set(term, Math.log(totalDocs / (docCount + 1)));
    }
  }

  /**
   * Transform a single document to TF-IDF vector
   */
  transform(note: ParsedNote): TFIDFVector {
    const tokens = this.extractTokens(note.normalizedContent);
    const termFreq = new Map<string, number>();
    
    // Calculate term frequencies
    for (const token of tokens) {
      if (this.vocabulary.has(token)) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }
    }
    
    // Convert to TF-IDF
    const vector: TFIDFVector = {};
    const maxFreq = Math.max(...Array.from(termFreq.values()));
    
    for (const [term, freq] of termFreq) {
      const tf = freq / maxFreq;
      const idf = this.idf.get(term) || 0;
      vector[term] = tf * idf;
    }
    
    return vector;
  }

  /**
   * Transform all documents to TF-IDF vectors
   */
  transformAll(notes: ParsedNote[]): TFIDFVector[] {
    return notes.map(note => this.transform(note));
  }
}

export class KMeans {
  private nInit: number;
  private maxIter: number;
  private tolerance: number;

  constructor(nInit = 5, maxIter = 50, tolerance = 1e-4) {
    this.nInit = nInit;
    this.maxIter = maxIter;
    this.tolerance = tolerance;
  }

  /**
   * Calculate cosine distance between two vectors
   */
  private cosineDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 1; // Maximum distance for zero vectors
    }
    
    return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
  }

  /**
   * Convert TF-IDF vector to dense array
   */
  private vectorToArray(vector: TFIDFVector, vocabulary: string[]): number[] {
    const array = new Array(vocabulary.length).fill(0);
    for (let i = 0; i < vocabulary.length; i++) {
      array[i] = vector[vocabulary[i]] || 0;
    }
    return array;
  }

  /**
   * Initialize centroids randomly
   */
  private initializeCentroids(k: number, vectors: number[][]): number[][] {
    const centroids: number[][] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < k; i++) {
      let idx;
      do {
        idx = Math.floor(Math.random() * vectors.length);
      } while (used.has(idx));
      used.add(idx);
      centroids.push([...vectors[idx]]);
    }
    
    return centroids;
  }

  /**
   * Assign points to closest centroid
   */
  private assignClusters(vectors: number[][], centroids: number[][]): number[] {
    const labels = new Array(vectors.length);
    
    for (let i = 0; i < vectors.length; i++) {
      let minDistance = Infinity;
      let bestCluster = 0;
      
      for (let j = 0; j < centroids.length; j++) {
        const distance = this.cosineDistance(vectors[i], centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          bestCluster = j;
        }
      }
      
      labels[i] = bestCluster;
    }
    
    return labels;
  }

  /**
   * Update centroids based on assigned points
   */
  private updateCentroids(vectors: number[][], labels: number[], k: number): number[][] {
    const centroids: number[][] = [];
    const vectorLength = vectors[0].length;
    
    for (let i = 0; i < k; i++) {
      const clusterVectors = vectors.filter((_, idx) => labels[idx] === i);
      
      if (clusterVectors.length === 0) {
        // If cluster is empty, keep previous centroid
        centroids.push(new Array(vectorLength).fill(0));
        continue;
      }
      
      const centroid = new Array(vectorLength).fill(0);
      for (const vector of clusterVectors) {
        for (let j = 0; j < vectorLength; j++) {
          centroid[j] += vector[j];
        }
      }
      
      // Average
      for (let j = 0; j < vectorLength; j++) {
        centroid[j] /= clusterVectors.length;
      }
      
      centroids.push(centroid);
    }
    
    return centroids;
  }

  /**
   * Calculate inertia (sum of squared distances to centroids)
   */
  private calculateInertia(vectors: number[][], labels: number[], centroids: number[][]): number {
    let inertia = 0;
    
    for (let i = 0; i < vectors.length; i++) {
      const cluster = labels[i];
      const distance = this.cosineDistance(vectors[i], centroids[cluster]);
      inertia += distance * distance;
    }
    
    return inertia;
  }

  /**
   * Fit K-means clustering
   */
  fit(vectors: TFIDFVector[], k: number): KMeansResult {
    if (vectors.length === 0) {
      throw new Error('Cannot cluster empty dataset');
    }
    
    if (k <= 0 || k > vectors.length) {
      throw new Error(`Invalid k: ${k}. Must be between 1 and ${vectors.length}`);
    }
    
    // Get vocabulary from all vectors
    const vocabulary = Array.from(new Set(vectors.flatMap(v => Object.keys(v))));
    
    // Convert to dense arrays
    const denseVectors = vectors.map(v => this.vectorToArray(v, vocabulary));
    
    let bestResult: KMeansResult | null = null;
    let bestInertia = Infinity;
    
    // Run multiple initializations
    for (let init = 0; init < this.nInit; init++) {
      const centroids = this.initializeCentroids(k, denseVectors);
      let labels = this.assignClusters(denseVectors, centroids);
      let prevInertia = Infinity;
      
      // Iterate until convergence
      for (let iter = 0; iter < this.maxIter; iter++) {
        const newCentroids = this.updateCentroids(denseVectors, labels, k);
        labels = this.assignClusters(denseVectors, newCentroids);
        
        const inertia = this.calculateInertia(denseVectors, labels, newCentroids);
        
        // Check convergence
        if (Math.abs(prevInertia - inertia) < this.tolerance) {
          break;
        }
        
        prevInertia = inertia;
      }
      
      const finalInertia = this.calculateInertia(denseVectors, labels, centroids);
      
      if (finalInertia < bestInertia) {
        bestInertia = finalInertia;
        bestResult = {
          clusters: denseVectors.map((_, i) => [i]).filter((_, i) => labels[i] !== undefined),
          centroids,
          labels,
          inertia: finalInertia
        };
      }
    }
    
    if (!bestResult) {
      throw new Error('K-means fitting failed');
    }
    
    return bestResult;
  }
}

/**
 * Calculate optimal K using simple heuristic
 */
export function calculateOptimalK(notes: ParsedNote[]): number {
  const n = notes.length;
  const k = Math.max(6, Math.min(40, Math.floor(Math.sqrt(n / 2))));
  return k;
}

/**
 * Extract top terms from a centroid vector
 */
export function extractTopTerms(centroid: number[], vocabulary: string[], topN = 10): string[] {
  const termScores = vocabulary.map((term, i) => ({
    term,
    score: centroid[i] || 0
  }));
  
  return termScores
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(item => item.term);
}

/**
 * Generate section label from top terms
 */
export function generateSectionLabel(topTerms: string[]): string {
  if (topTerms.length === 0) {
    return 'General';
  }
  
  // Take first term and convert to title case
  const firstTerm = topTerms[0]
    .split('_')[0] // Take first part of bigram
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .trim();
  
  if (!firstTerm) {
    return 'General';
  }
  
  const titleCase = firstTerm
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Limit length and ensure valid characters
  return titleCase
    .substring(0, 45)
    .replace(/[^A-Za-z0-9\s_-]/g, '')
    .trim() || 'General';
}

/**
 * Create clusters from K-means result
 */
export function createClusters(
  notes: ParsedNote[],
  kmeansResult: KMeansResult,
  vocabulary: string[]
): Cluster[] {
  const clusters: Cluster[] = [];
  
  for (let i = 0; i < kmeansResult.centroids.length; i++) {
    const clusterNotes = notes.filter((_, idx) => kmeansResult.labels[idx] === i);
    const topTerms = extractTopTerms(kmeansResult.centroids[i], vocabulary);
    const label = generateSectionLabel(topTerms);
    
    clusters.push({
      id: `cluster_${i}`,
      label,
      notes: clusterNotes,
      topTerms,
      centroid: kmeansResult.centroids[i]
    });
  }
  
  return clusters;
}
