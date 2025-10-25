# GitHub Stars Scraper with AI Enrichment

A powerful Node.js tool that fetches all stargazers from a GitHub repository, enriches their profiles with professional data (role, seniority, company), and exports everything to Google Sheets.

## Features

### Core Features
- Fetches all stargazers from any public GitHub repository
- Extracts detailed user information including:
  - Username, name, and email
  - Bio, company, and location
  - Blog/website and Twitter handle
  - Follower/following counts
  - Number of public repositories
  - Profile and avatar URLs
  - Account creation date
- Exports data to Google Sheets with formatted headers
- Handles rate limiting automatically
- Progress tracking during execution

### 🆕 AI-Powered Enrichment (New!)

The scraper now uses a **3-level cascade strategy** to enrich user data:

#### **Level 1: Pattern Matching** (Free, Instant)
- Analyzes GitHub bio, company, and profile data
- Extracts role and seniority using regex patterns
- Detects common job titles and experience levels
- No API calls required

#### **Level 2: AI Analysis** (Requires OpenAI API, ~$0.01-0.02/user)
- Uses GPT-4o-mini to analyze user profiles intelligently
- Infers role, seniority, and company from unstructured text
- Provides confidence scores
- Fills gaps left by Level 1

#### **Level 3: LinkedIn Search** (Requires Google Search API)
- Searches LinkedIn for user profiles
- Returns **ALL matching profiles** (not just the first one)
- Extracts role and company from LinkedIn page titles
- **Rate limiting**: 100 free queries/day, then prompts user to continue with paid tier
- Interactive prompt asks: continue with paid queries, wait 24h, or skip

## Prerequisites

- Node.js 18 or higher
- A GitHub account
- A Google Cloud Platform account
- **(Optional)** OpenAI API key for AI enrichment
- **(Optional)** Google Custom Search API for LinkedIn search

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd github-stars-scraper
npm install
```

### 2. Set Up GitHub Access Token

1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "Stars Scraper"
4. Select the following permissions:
   - `public_repo` (or just `repo` if you need private repos)
5. Click "Generate token"
6. Copy the token (you won't see it again!)

### 3. Set Up Google Sheets API

#### Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a service account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Give it a name like "github-scraper"
   - Click "Create and Continue"
   - Skip the optional steps and click "Done"

5. Create and download credentials:
   - Click on your newly created service account
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Click "Create"
   - Save the downloaded file as `credentials.json` in the project root

#### Create and Share a Google Spreadsheet

1. Create a new [Google Spreadsheet](https://sheets.google.com/)
2. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
3. Share the spreadsheet with your service account email:
   - Click the "Share" button
   - Paste the service account email (found in credentials.json as `client_email`)
   - Give it "Editor" access
   - Uncheck "Notify people"
   - Click "Share"

### 4. (Optional) Set Up AI Enrichment

#### Option A: OpenAI API for AI Analysis

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Give it a name like "GitHub Scraper"
4. Copy the API key (starts with `sk-...`)
5. Add to your `.env` file (see step 5 below)

**Cost**: ~$0.01-0.02 per user analyzed (very affordable!)

#### Option B: Google Custom Search API for LinkedIn Search

1. Go to [Google Custom Search](https://developers.google.com/custom-search/v1/overview)
2. Click "Get a Key" and create a new project
3. Copy the API key
4. Create a Custom Search Engine:
   - Go to [Google CSE](https://cse.google.com/cse/all)
   - Click "Add"
   - In "Sites to search", enter: `linkedin.com/in/*`
   - Give it a name
   - Click "Create"
   - Copy the "Search engine ID"
5. Add both to your `.env` file

**Cost**:
- Free: 100 searches/day
- Paid: $5 per 1000 searches after free tier
- The script will prompt you when you hit the limit!

### 5. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```env
   # Required
   GITHUB_TOKEN=your_github_token_here
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
   GOOGLE_SERVICE_ACCOUNT_PATH=./credentials.json

   # Optional: For AI enrichment
   OPENAI_API_KEY=sk-your_openai_key_here

   # Optional: For LinkedIn search
   GOOGLE_API_KEY=your_google_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
   ```

**Note**: If you don't add the optional API keys, the scraper will still work but won't enrich data with role/seniority/company information.

### 6. Customize Target Repository (Optional)

By default, the scraper targets `https://github.com/datapizza-labs/datapizza-ai`.

To change the target repository, edit `index.js` and modify the `REPO_URL` constant:

```javascript
const REPO_URL = 'https://github.com/your-username/your-repo';
```

## Usage

Run the scraper:

```bash
npm start
```

### What Happens During Execution

1. **GitHub Scraping**: Fetches all stargazers and their basic info
2. **Enrichment Phase** (if API keys configured):
   - Level 1: Instant pattern matching
   - Level 2: AI analysis (shows progress per user)
   - Level 3: LinkedIn search (asks for confirmation after 100 free queries)
3. **Export**: Writes all data to Google Sheets

### Example Output

```
===========================================
GitHub Stars Scraper
===========================================

Target Repository: datapizza-labs/datapizza-ai

Fetching stargazers and their details...
Total stargazers found: 450

🔍 Starting enrichment process...
===========================================
🚀 STARTING USER ENRICHMENT (3-LEVEL CASCADE)
===========================================

[1/450] ==================================================
📊 Enriching: john_doe (John Doe)
  [Level 1] Checking existing data...
  [Level 2] Running AI analysis...
  ✓ [Level 2] AI analysis complete (confidence: high)

[2/450] ==================================================
📊 Enriching: jane_smith (Jane Smith)
  [Level 1] Checking existing data...
  ✓ [Level 1] Complete data found from profile!

...

[101/450] ==================================================
⚠️  FREE TIER LIMIT REACHED
You've used 100 Google Search queries (free limit: 100/day)

Options:
1. Continue with PAID queries (~$5 per 1000 queries)
2. Wait 24 hours for the free limit to reset
3. Skip LinkedIn search for remaining users

Enter your choice (1/2/3): 3

⏭️  Skipping LinkedIn search for remaining users...

📊 ENRICHMENT STATISTICS
Total users processed: 450
Level 1 success (pattern matching): 180
Level 2 success (AI analysis): 220
Level 3 success (LinkedIn search): 50
Failed to enrich: 0

Exporting data to Google Sheets...
✓ Scraping completed successfully!
```

## Output Format

The Google Sheet will contain these columns:

### Basic Information (from GitHub)
| Column | Description |
|--------|-------------|
| Username | GitHub username |
| Name | Full name |
| Email | Public email address |
| Company (GitHub) | Company from GitHub profile |
| Location | Geographic location |
| Bio | Profile bio |
| Blog/Website | Personal website or blog |
| Twitter | Twitter handle |
| Followers | Number of followers |
| Following | Number of users following |
| Public Repos | Number of public repositories |
| Profile URL | Link to GitHub profile |
| Avatar URL | Profile picture URL |
| Account Created | Account creation date |

### 🆕 Enriched Data (from AI analysis)
| Column | Description |
|--------|-------------|
| **Role** | Job role (e.g., "Software Engineer", "Product Manager") |
| **Seniority** | Seniority level (e.g., "Senior", "Staff", "Principal") |
| **Company (Enriched)** | Current company from enrichment |
| **LinkedIn Profiles (All)** | All matching LinkedIn URLs (one per line) |
| **Data Source** | How data was obtained (e.g., "AI Analysis", "LinkedIn Search") |
| **Confidence** | Confidence level: high/medium/low |

## Cost Estimation

For 500 stargazers:

- **GitHub API**: Free (with token)
- **Google Sheets API**: Free
- **Level 1 Enrichment**: Free (pattern matching)
- **Level 2 Enrichment (OpenAI)**: ~$5-10 total
- **Level 3 Enrichment (Google Search)**:
  - First 100 users/day: Free
  - Next 400 users: ~$2

**Total estimated cost**: $7-12 for 500 users (one-time)

## Rate Limiting

The scraper includes automatic rate limiting:

- **GitHub API**: Small delays between requests
- **OpenAI API**: 100ms delay between calls
- **Google Search**:
  - Tracks usage automatically
  - Prompts user at 100 queries (free limit)
  - User can choose to continue (paid), wait, or skip

## Troubleshooting

### "GITHUB_TOKEN is not set"
Make sure you've created a `.env` file and added your GitHub token.

### "GOOGLE_SPREADSHEET_ID is not set"
Add your spreadsheet ID to the `.env` file.

### "Error initializing Google Sheets API"
Check that:
- Your `credentials.json` file is in the project root
- The file is valid JSON
- You've shared the spreadsheet with the service account email

### "Permission denied" when writing to sheets
Make sure you've shared the spreadsheet with your service account email (found in `credentials.json` as `client_email`) with Editor permissions.

### Enrichment not working
- Check that you've added `OPENAI_API_KEY` to `.env`
- Verify your OpenAI API key is valid and has credits
- For Google Search, ensure both `GOOGLE_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` are set

## Project Structure

```
github-stars-scraper/
├── src/
│   ├── github-service.js        # GitHub API integration
│   ├── sheets-service.js        # Google Sheets API integration
│   ├── ai-service.js           # OpenAI integration for analysis
│   ├── search-service.js       # Google Custom Search for LinkedIn
│   └── enrichment-service.js   # 3-level cascade enrichment
├── index.js                     # Main scraper script
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## Advanced Configuration

### Disable Specific Enrichment Levels

You can disable enrichment levels by not providing the API keys:

- **No enrichment**: Don't add any optional API keys
- **Only pattern matching + AI**: Add only `OPENAI_API_KEY`
- **Only pattern matching + LinkedIn**: Add only `GOOGLE_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`
- **All levels**: Add all API keys

### Change AI Model

Edit `src/ai-service.js` line 29 to use a different OpenAI model:

```javascript
model: 'gpt-4o-mini', // Change to 'gpt-4' for better accuracy (higher cost)
```

## License

MIT
