import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Brain, Link as LinkIcon, Download, Shield, Clock } from 'lucide-react';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How Notion Prep Works
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl">
            Notion Prep transforms your Markdown exports into organized, Notion-ready sections 
            using advanced clustering algorithms and intelligent link rewriting.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-lg">1. Upload & Extract</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload your notes ZIP file and optional assets ZIP. We extract and scan 
                all your Markdown files, parsing front-matter, headings, links, and images.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle className="text-lg">2. Smart Clustering</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Using TF-IDF vectorization and K-means clustering, we analyze your content 
                to group related notes together into logical sections.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <LinkIcon className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle className="text-lg">3. Link Rewriting</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                We intelligently rewrite internal links and image references to work 
                correctly in your new Notion structure, maintaining connectivity.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Download className="h-8 w-8 text-orange-500 mb-2" />
              <CardTitle className="text-lg">4. Package & Download</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                We create a clean folder structure with section indexes and package 
                everything into a downloadable ZIP file ready for Notion import.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-red-500 mb-2" />
              <CardTitle className="text-lg">5. Privacy & Cleanup</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Your files are processed locally and automatically deleted after 24 hours. 
                No data is stored permanently on our servers.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-8 w-8 text-indigo-500 mb-2" />
              <CardTitle className="text-lg">6. Import to Notion</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Extract the ZIP file and import the organized sections into Notion. 
                Your notes will be properly structured and linked.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Technical Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Clustering Algorithms</CardTitle>
              <CardDescription>
                How we organize your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">TF-IDF Vectorization</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We convert your text into numerical vectors using Term Frequency-Inverse Document Frequency, 
                  capturing the importance of words in each document relative to the entire collection.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">K-Means Clustering</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Using cosine distance and multiple random initializations, we group similar notes together 
                  into coherent sections based on content similarity.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Auto K Selection</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We automatically determine the optimal number of sections using a heuristic based on 
                  your total number of notes: max(6, min(40, floor(sqrt(n/2)))).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grouping Strategies</CardTitle>
              <CardDescription>
                Different ways to organize your notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Content Clustering</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Groups notes by semantic similarity using machine learning. Best for large collections 
                  where you want related content automatically grouped together.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Heading-Based</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Groups notes by their first H1 heading. Perfect if your notes already have 
                  a clear hierarchical structure.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Tag-Based</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Groups notes by their first tag from front-matter. Ideal if you&apos;ve been 
                  consistently tagging your notes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
            <CardDescription>
              What makes Notion Prep special
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Smart Link Resolution</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically resolves internal links by filename, title, and wiki-link patterns, 
                    ensuring your note connections remain intact in Notion.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Asset Organization</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Intelligently organizes images and assets, supporting both UUID-based folder structures 
                    and global asset collections.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Section Indexing</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Creates index.md files for each section with clickable tables of contents, 
                    making navigation easy in Notion.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Front-Matter Support</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Parses YAML front-matter to extract titles, tags, and metadata, 
                    using this information for better organization.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Processing Reports</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Generates detailed reports showing what was processed, how many links were rewritten, 
                    and any unresolved references.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Privacy First</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All processing happens locally with automatic cleanup. Your data never leaves 
                    your control and is deleted after 24 hours.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limitations */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Limitations & Notes</CardTitle>
            <CardDescription>
              Important things to know
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Notion Import Limitations</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notion doesn&apos;t automatically create backlinks when importing. You may need to manually 
                  verify and update some internal links after import.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">File Size Limits</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Maximum upload size is 300MB per file. For larger collections, consider splitting 
                  your export into multiple batches.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Markdown Compatibility</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Works best with standard Markdown. Complex formatting or custom syntax may not 
                  be preserved perfectly in the Notion import.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-medium mb-4">Ready to get started?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload your Markdown files and see how Notion Prep can organize your knowledge base.
              </p>
              <Link href="/">
                <Button size="lg">
                  Start Processing Your Notes
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
