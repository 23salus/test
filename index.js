import dotenv from 'dotenv';
import { GitHubService } from './src/github-service.js';
import { SheetsService } from './src/sheets-service.js';

// Load environment variables
dotenv.config();

// Configuration
const REPO_URL = 'https://github.com/datapizza-labs/datapizza-ai';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './credentials.json';

/**
 * Parse GitHub repository URL to extract owner and repo name
 * @param {string} url - GitHub repository URL
 * @returns {Object} Object with owner and repo properties
 */
function parseRepoUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  return {
    owner: match[1],
    repo: match[2],
  };
}

/**
 * Main function to run the scraper
 */
async function main() {
  console.log('===========================================');
  console.log('GitHub Stars Scraper');
  console.log('===========================================\n');

  try {
    // Validate environment variables
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set in .env file');
    }

    if (!SPREADSHEET_ID) {
      throw new Error('GOOGLE_SPREADSHEET_ID is not set in .env file');
    }

    // Parse repository URL
    const { owner, repo } = parseRepoUrl(REPO_URL);
    console.log(`Target Repository: ${owner}/${repo}\n`);

    // Initialize GitHub service
    console.log('Initializing GitHub service...');
    const githubService = new GitHubService(GITHUB_TOKEN);

    // Fetch stargazers with detailed information
    console.log('Fetching stargazers and their details...');
    const stargazers = await githubService.fetchStargazersWithDetails(owner, repo);

    console.log(`\n✓ Successfully fetched ${stargazers.length} stargazers\n`);

    // Initialize Google Sheets service
    console.log('Initializing Google Sheets service...');
    const sheetsService = new SheetsService(CREDENTIALS_PATH, SPREADSHEET_ID);
    await sheetsService.initialize();

    // Export to Google Sheets
    console.log('\nExporting data to Google Sheets...');
    await sheetsService.exportStargazers(stargazers);

    console.log('\n===========================================');
    console.log('✓ Scraping completed successfully!');
    console.log('===========================================');
  } catch (error) {
    console.error('\n❌ Error:', error.message);

    // Provide helpful error messages
    if (error.message.includes('credentials')) {
      console.error('\nMake sure you have:');
      console.error('1. Created a Google Cloud service account');
      console.error('2. Downloaded the credentials JSON file');
      console.error('3. Saved it as credentials.json in the project root');
      console.error('4. Shared your spreadsheet with the service account email');
    }

    if (error.message.includes('GITHUB_TOKEN')) {
      console.error('\nMake sure you have:');
      console.error('1. Created a GitHub personal access token');
      console.error('2. Added it to your .env file');
    }

    process.exit(1);
  }
}

// Run the scraper
main();
