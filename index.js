import dotenv from 'dotenv';
import fs from 'fs';
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
 * Main function to fetch GitHub data and export to sheets
 * (NO enrichment - use enrich.js for that)
 */
async function main() {
  console.log('===========================================');
  console.log('GitHub Stars Scraper - FETCH PHASE');
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

    // Fetch stargazers with detailed information (INCLUDING social accounts!)
    console.log('Fetching stargazers and their details...');
    console.log('(This will make 2 API calls per user: basic info + social accounts)\n');
    const stargazers = await githubService.fetchStargazersWithDetails(owner, repo);

    console.log(`\n✓ Successfully fetched ${stargazers.length} stargazers`);

    // Count how many have LinkedIn
    const linkedinCount = stargazers.filter(u => u.linkedinUrl).length;
    console.log(`✓ Found ${linkedinCount} LinkedIn URLs directly from GitHub profiles!\n`);

    // Save data to cache file for enrichment phase
    const cacheFile = './.stargazers-cache.json';
    console.log('Saving data to cache file for enrichment...');
    fs.writeFileSync(cacheFile, JSON.stringify({
      fetchedAt: new Date().toISOString(),
      repository: `${owner}/${repo}`,
      count: stargazers.length,
      stargazers: stargazers
    }, null, 2));
    console.log(`✓ Saved ${stargazers.length} stargazers to ${cacheFile}\n`);

    // Initialize Google Sheets service
    console.log('Initializing Google Sheets service...');
    const sheetsService = new SheetsService(CREDENTIALS_PATH, SPREADSHEET_ID);
    await sheetsService.initialize();

    // Export to Google Sheets
    console.log('\nExporting data to Google Sheets...');
    await sheetsService.exportStargazers(stargazers);

    console.log('\n===========================================');
    console.log('✓ FETCH PHASE completed successfully!');
    console.log('===========================================');
    console.log('\nNext steps:');
    console.log('  1. Check your Google Sheet to see the data');
    console.log('  2. If you want AI enrichment, run: npm run enrich');
    console.log('===========================================\n');
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
