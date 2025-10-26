# GitHub Stars Scraper with AI Enrichment

A powerful Node.js tool that fetches all stargazers from a GitHub repository, enriches their profiles with professional data (role, seniority, company), and exports everything to Google Sheets.

## 🆕 Two-Phase Architecture

This scraper uses a **two-phase workflow** for maximum flexibility and cost control:

### Phase 1: Fetch (Fast & Free)
- Downloads all GitHub data including social accounts from profile sidebars
- **NEW**: Extracts LinkedIn, Twitter, and other social links directly from GitHub
- Saves to Google Sheets and local cache
- **Time**: 2-5 minutes for 500 users
- **Cost**: $0 (completely free!)

### Phase 2: Enrich (Optional, AI-Powered)
- Reads cached data (no re-fetch needed)
- Adds role, seniority, company via AI analysis
- Searches LinkedIn for missing profiles
- **Time**: 4-10 minutes for 500 users
- **Cost**: ~$7-12 for 500 users

**Workflow**: Fetch first → Review data → Decide if enrichment is worth it → Enrich if needed

## Features

### Data Extracted from GitHub (Phase 1 - FREE)
- Username, name, and email
- Bio, company, and location
- Blog/website URL
- **Social accounts from profile sidebar**:
  - LinkedIn URLs
  - Twitter/X URLs
  - Mastodon, YouTube, Facebook, Instagram, etc.
- Follower/following counts
- Number of public repositories
- Profile and avatar URLs
- Account creation date

### AI Enrichment (Phase 2 - Optional)

The enrichment uses a **3-level cascade strategy**:

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
- Searches LinkedIn ONLY for users without LinkedIn in GitHub profile
- Returns **ALL matching profiles** (not just the first one)
- Extracts role and company from LinkedIn page titles
- **Rate limiting**: 100 free queries/day, then prompts user to continue
- Interactive prompt: continue with paid queries, wait 24h, or skip

## Prerequisites

- Node.js 18 or higher
- A GitHub account
- A Google Cloud Platform account
- **(Optional)** OpenAI API key for AI enrichment (Phase 2)
- **(Optional)** Google Custom Search API for LinkedIn search (Phase 2)

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

### 4. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   # Required for Phase 1 (fetch)
   GITHUB_TOKEN=your_github_token_here
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
   GOOGLE_SERVICE_ACCOUNT_PATH=./credentials.json

   # Optional for Phase 2 (enrich)
   OPENAI_API_KEY=sk-your_openai_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
   ```

### 5. (Optional) Set Up AI Enrichment APIs

Only needed if you want to run Phase 2 (enrichment).

#### Option A: OpenAI API for AI Analysis

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the API key (starts with `sk-...`)
4. Add to your `.env` file

**Cost**: ~$0.01-0.02 per user analyzed

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

**Cost**: Free for first 100 searches/day, then $5 per 1000 searches

### 6. Customize Target Repository (Optional)

Edit `index.js` and modify the `REPO_URL` constant:

```javascript
const REPO_URL = 'https://github.com/your-username/your-repo';
```

## Usage

### Two-Phase Workflow (Recommended)

#### Phase 1: Fetch GitHub Data

```bash
npm start
# or
npm run fetch
```

**What it does:**
- Fetches all stargazers and their GitHub profile data
- Extracts social accounts (LinkedIn, Twitter, etc.) from profile sidebars
- Saves to Google Sheets
- Saves to `.stargazers-cache.json` for Phase 2
- Shows how many LinkedIn URLs were found

**Output:**
```
✓ Successfully fetched 500 stargazers
✓ Found 180 LinkedIn URLs directly from GitHub profiles!
✓ Saved to Google Sheets
✓ Saved to .stargazers-cache.json

Next steps:
  1. Check your Google Sheet to see the data
  2. If you want AI enrichment, run: npm run enrich
```

#### Phase 2: Enrich Data (Optional)

**Only run this if you want AI-powered enrichment and are willing to spend ~$7-12 for 500 users.**

```bash
npm run enrich
```

**What it does:**
- Reads cached data from `.stargazers-cache.json`
- Shows cost estimate and asks for confirmation
- Runs 3-level enrichment:
  - Level 1: Pattern matching (free)
  - Level 2: AI analysis with OpenAI
  - Level 3: LinkedIn search (only for users without LinkedIn in GitHub)
- Updates Google Sheets with enriched data

**Interactive prompt:**
```
============================================================
ENRICHMENT CONFIGURATION
============================================================
Users with LinkedIn from GitHub: 180
Users needing LinkedIn search: 320

Estimated time: ~4 minutes
Estimated cost: ~$7.50
============================================================

Start enrichment process? (y/n):
```

### Quick Start (GitHub Data Only)

If you just want GitHub data without enrichment:

```bash
npm start
```

That's it! Check your Google Sheet for all the data including LinkedIn URLs from profiles.

### One-Shot Workflow (Fetch + Enrich Together)

If you're sure you want enrichment:

```bash
# Phase 1: Fetch
npm start

# Phase 2: Enrich (when prompted, type 'y')
npm run enrich
```

## What Data You Get

### Phase 1 Output (FREE - GitHub Only)

The Google Sheet will have these columns:

| Column | Description | Source |
|--------|-------------|--------|
| Username | GitHub username | GitHub API |
| Name | Full name | GitHub API |
| Email | Public email | GitHub API |
| Company (GitHub) | Company from profile | GitHub API |
| Location | Location | GitHub API |
| Bio | Profile bio | GitHub API |
| Blog/Website | Personal site | GitHub API |
| Twitter Username | Twitter handle | GitHub API |
| Followers | Follower count | GitHub API |
| Following | Following count | GitHub API |
| Public Repos | Repository count | GitHub API |
| Profile URL | GitHub profile link | GitHub API |
| Avatar URL | Profile picture | GitHub API |
| Account Created | Creation date | GitHub API |
| **LinkedIn URL (GitHub)** | LinkedIn from sidebar | GitHub API ⭐ |
| **Twitter URL (GitHub)** | Twitter from sidebar | GitHub API ⭐ |
| **Other Social (GitHub)** | Other social links | GitHub API ⭐ |

**⭐ NEW**: These columns are extracted from the profile sidebar and often contain LinkedIn URLs!

### Phase 2 Output (Enriched Data)

Additional columns added by enrichment:

| Column | Description |
|--------|-------------|
| **Role** | Job role (e.g., "Software Engineer") |
| **Seniority** | Seniority level (e.g., "Senior", "Staff") |
| **Company (Enriched)** | Current company from AI/LinkedIn |
| **LinkedIn Profiles (Search)** | LinkedIn profiles from Google Search |
| **Data Source** | How data was obtained |
| **Confidence** | Confidence level (high/medium/low) |

## Cost Breakdown

### Phase 1: Fetch (Always FREE)

- GitHub API: Free (with token, 5000 requests/hour)
- Google Sheets API: Free
- **Total: $0**

### Phase 2: Enrich (Optional)

For 500 stargazers:

**Scenario A**: 180 already have LinkedIn in GitHub profile
- OpenAI (500 users): ~$7.50
- Google Search (320 users need search): ~$1.10
- **Total: ~$8.60**

**Scenario B**: Few have LinkedIn in GitHub
- OpenAI (500 users): ~$7.50
- Google Search (400 users after 100 free): ~$1.50
- **Total: ~$9.00**

**Key Insight**: Phase 1 often finds 30-50% of LinkedIn URLs for FREE, significantly reducing Phase 2 costs!

## Examples

### Example 1: Quick Data Grab (FREE)

```bash
npm start
```

Get all GitHub data + social accounts in 2-3 minutes, $0.

### Example 2: Full Analysis

```bash
# Day 1: Fetch data (free)
npm start

# Review Google Sheet, decide enrichment is worth it

# Day 2: Run enrichment
npm run enrich
# Type 'y' when prompted
```

### Example 3: Check What You Have First

```bash
# Fetch data
npm start

# Check the "LinkedIn URL (GitHub)" column in your sheet
# If 80% already have LinkedIn, maybe skip enrichment!
```

## Troubleshooting

### "GITHUB_TOKEN is not set"
Make sure you've created a `.env` file and added your GitHub token.

### "GOOGLE_SPREADSHEET_ID is not set"
Add your spreadsheet ID to the `.env` file.

### "Cache file not found" (when running enrich)
Run `npm start` first to fetch data from GitHub.

### "Error initializing Google Sheets API"
Check that:
- Your `credentials.json` file is in the project root
- The file is valid JSON
- You've shared the spreadsheet with the service account email

### Not finding social accounts
The scraper now makes 2 API calls per user:
1. GET /users/{username} - basic info
2. GET /users/{username}/social_accounts - social links

If you're not seeing LinkedIn URLs, the users might not have them in their GitHub profiles.

## Project Structure

```
github-stars-scraper/
├── src/
│   ├── github-service.js        # GitHub API (basic + social accounts)
│   ├── sheets-service.js        # Google Sheets integration
│   ├── ai-service.js           # OpenAI integration
│   ├── search-service.js       # Google Custom Search
│   └── enrichment-service.js   # 3-level cascade enrichment
├── index.js                     # Phase 1: Fetch script
├── enrich.js                    # Phase 2: Enrichment script
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment template
├── .gitignore                  # Git ignore rules
├── .stargazers-cache.json      # Cached data (auto-generated)
└── README.md                   # This file
```

## Advanced Tips

### Automating Fetch Only

For CI/CD or scheduled jobs where you only want data collection:

```bash
# This runs fetch without any prompts
npm start
```

No prompts, no questions - just fetches and exports to sheets.

### Re-running Enrichment

You can re-run enrichment multiple times on the same cached data:

```bash
npm run enrich  # First time
# ... make changes to enrichment logic ...
npm run enrich  # Run again without re-fetching GitHub
```

### Checking Cache

The cache file `.stargazers-cache.json` contains:
```json
{
  "fetchedAt": "2025-10-26T...",
  "repository": "datapizza-labs/datapizza-ai",
  "count": 500,
  "stargazers": [...]
}
```

You can inspect it to see what data was fetched.

## Why Two Phases?

1. **Try Before You Buy**: See all free GitHub data before spending on AI
2. **Cost Control**: Many users already have LinkedIn in profiles (30-50%)!
3. **Flexibility**: Fetch once, experiment with enrichment multiple times
4. **Performance**: Re-enrichment doesn't require re-fetching from GitHub
5. **Transparency**: Clear separation between free and paid operations

## License

MIT
