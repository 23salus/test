# GitHub Stars Scraper

A Node.js tool that fetches all stargazers from a GitHub repository and exports their profiles and social accounts to Google Sheets.

## Features

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

## Prerequisites

- Node.js 18 or higher
- A GitHub account
- A Google Cloud Platform account

## Setup Instructions

### 1. Clone and Install

```bash
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

2. Edit `.env` and fill in your values:
   ```env
   GITHUB_TOKEN=your_github_token_here
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
   GOOGLE_SERVICE_ACCOUNT_PATH=./credentials.json
   ```

### 5. Customize Target Repository (Optional)

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

The script will:
1. Fetch all stargazers from the target repository
2. Retrieve detailed profile information for each user
3. Export everything to your Google Spreadsheet
4. Display progress and a link to the spreadsheet when complete

## Output Format

The Google Sheet will contain the following columns:

| Column | Description |
|--------|-------------|
| Username | GitHub username |
| Name | Full name |
| Email | Public email address |
| Company | Company/organization |
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

## Rate Limiting

The scraper includes automatic delays to respect GitHub's API rate limits:
- Without authentication: 60 requests per hour
- With authentication: 5,000 requests per hour

The script automatically adds small delays between requests to avoid hitting these limits.

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

## Project Structure

```
github-stars-scraper/
├── src/
│   ├── github-service.js    # GitHub API integration
│   └── sheets-service.js    # Google Sheets API integration
├── index.js                 # Main scraper script
├── package.json             # Dependencies and scripts
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## License

MIT
