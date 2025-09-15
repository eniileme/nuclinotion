# Notion Prep

Transform your Markdown exports into Notion-ready organized sections with smart clustering and intelligent link rewriting.

## Features

- **Smart Organization**: Automatically clusters notes by content similarity, headings, or tags
- **Link Rewriting**: Intelligently rewrites internal links and image references
- **Asset Management**: Organizes images and assets with UUID-based folder support
- **Privacy First**: All processing happens locally with automatic 24-hour cleanup
- **Multiple Strategies**: Choose from clustering, heading-based, or tag-based organization
- **Processing Reports**: Detailed reports showing what was processed and any issues

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Styling**: TailwindCSS + shadcn/ui + lucide-react
- **State Management**: React Query (TanStack Query)
- **File Processing**: jszip, unzipper for ZIP handling
- **Text Analysis**: Custom TF-IDF + K-Means clustering implementation
- **Storage**: In-memory + temporary files with TTL cleanup

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Local Development

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd notion-prep
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

4. **Try the sample data**:
   Click "Try Sample Data" to see the tool in action with pre-loaded content.

### Production Build

```bash
npm run build
npm start
```

## Usage

### 1. Upload Your Files

- **Notes ZIP**: Upload a ZIP file containing your Markdown files
- **Assets ZIP** (optional): Upload a ZIP file containing images and other assets
- **Processing Options**: Choose clustering strategy and number of sections

### 2. Processing Options

- **Clustering K**: Number of sections to create (or "auto" for automatic)
- **Grouping Strategy**:
  - **Cluster**: Group by content similarity using machine learning
  - **Headings**: Group by first H1 heading
  - **Tags**: Group by first tag from front-matter

### 3. Download Results

Once processing is complete, download the `notion_ready.zip` file containing:
- Organized section folders with index files
- Rewritten markdown files with updated links
- Properly organized assets
- Processing report with details

## File Structure

```
notion-prep/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── jobs/          # Job management endpoints
│   │   │   └── cleanup/       # Cleanup endpoint
│   │   ├── job/[id]/          # Job status page
│   │   ├── how-it-works/      # Documentation page
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── UploadCard.tsx    # File upload interface
│   │   ├── Progress.tsx      # Processing progress
│   │   ├── SectionPreview.tsx # Results preview
│   │   └── ErrorNotice.tsx   # Error handling
│   └── lib/                  # Core logic
│       ├── types.ts          # TypeScript definitions
│       ├── clustering.ts     # TF-IDF + K-Means algorithms
│       ├── md.ts            # Markdown parsing utilities
│       ├── fsx.ts           # File system helpers
│       └── pipeline.ts      # Main processing pipeline
├── public/                   # Static assets
└── README.md
```

## API Endpoints

### POST /api/jobs
Create a new processing job
- **Body**: FormData with notesZip, assetsZip (optional), clusteringK, groupingStrategy
- **Response**: `{ jobId: string }`

### GET /api/jobs?action=sample
Create a sample job with pre-loaded data
- **Response**: `{ jobId: string }`

### GET /api/jobs/[id]/status
Get job processing status
- **Response**: Job status object with progress and result

### GET /api/jobs/[id]/download
Download the processed ZIP file
- **Response**: Binary ZIP file

### POST /api/cleanup
Manually trigger cleanup of expired jobs
- **Response**: `{ message: string, cleanedCount: number }`

## Clustering Algorithm

### TF-IDF Vectorization
- Extracts unigrams and bigrams from normalized text
- Removes code blocks, URLs, and special characters
- Calculates term frequency-inverse document frequency
- Builds vocabulary of top 50k terms

### K-Means Clustering
- Uses cosine distance for similarity measurement
- Multiple random initializations (n_init=5)
- Maximum 50 iterations or until convergence
- Auto K selection: `max(6, min(40, floor(sqrt(n/2))))`

### Section Labeling
- Extracts top terms from cluster centroids
- Converts to title case and sanitizes
- Limits to 45 characters with valid filesystem characters

## Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** (none required for basic functionality)
3. **Deploy** - Vercel will automatically build and deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

### Environment Variables

No environment variables are required for basic functionality. The app uses:
- In-memory storage for job statuses
- Temporary file system storage with automatic cleanup
- No external databases or services

## Limitations

- **File Size**: Maximum 300MB per upload
- **Notion Import**: Some internal links may need manual verification after import
- **Markdown Compatibility**: Works best with standard Markdown syntax
- **Processing Time**: Large collections may take several minutes to process

## Privacy & Security

- **Local Processing**: All file processing happens on the server
- **Automatic Cleanup**: Files are deleted after 24 hours
- **No Permanent Storage**: No data is stored permanently
- **No External Services**: No data is sent to third-party services

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the [How it Works](/how-it-works) page
2. Review the processing report in your downloaded ZIP
3. Open an issue on GitHub with details about your problem

## Changelog

### v1.0.0
- Initial release
- TF-IDF + K-Means clustering
- Multiple grouping strategies
- Link and image rewriting
- Asset organization
- Processing reports
- Sample data functionality