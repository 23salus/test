import dotenv from 'dotenv';
import readlineSync from 'readline-sync';
import { GitHubService } from './src/github-service.js';
import { SheetsService } from './src/sheets-service.js';
import { EnrichmentService } from './src/enrichment-service.js';

// Load environment variables
dotenv.config();

// Configuration
const REPO_URL = 'https://github.com/datapizza-labs/datapizza-ai';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './credentials.json';

// Optional: AI and Search API keys for enrichment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

// Command line arguments
// Usage: npm start -- --skip-enrichment  OR  npm start -- --auto-enrich
const args = process.argv.slice(2);
const SKIP_ENRICHMENT_FLAG = args.includes('--skip-enrichment') || args.includes('--no-enrich');
const AUTO_ENRICH_FLAG = args.includes('--enrich') || args.includes('--auto-enrich');

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

    // ASK USER: Run enrichment or skip?
    let enrichedStargazers = stargazers;
    let shouldEnrich = false;

    // Check if enrichment is possible
    const enrichmentAvailable = OPENAI_API_KEY || GOOGLE_API_KEY;

    // Handle command line flags
    if (SKIP_ENRICHMENT_FLAG) {
      console.log('\n⏭️  Skipping enrichment (--skip-enrichment flag detected)\n');
      shouldEnrich = false;
    } else if (AUTO_ENRICH_FLAG) {
      if (enrichmentAvailable) {
        console.log('\n🔍 Auto-enrichment enabled (--enrich flag detected)\n');
        shouldEnrich = true;
      } else {
        console.log('\n⏭️  Cannot auto-enrich: API keys not configured\n');
        shouldEnrich = false;
      }
    } else if (enrichmentAvailable) {
      // Interactive mode - ask user
      // Show what enrichment will do
      console.log('='.repeat(60));
      console.log('ENRICHMENT OPTIONS');
      console.log('='.repeat(60));
      console.log('The enrichment process will add:');
      console.log('  • Role (e.g., "Software Engineer", "Product Manager")');
      console.log('  • Seniority (e.g., "Senior", "Staff", "Principal")');
      console.log('  • Company (enriched from multiple sources)');
      console.log('  • LinkedIn profiles (if not already in GitHub profile)');
      console.log('');
      console.log('Available enrichment levels:');
      if (OPENAI_API_KEY) {
        console.log('  ✓ Level 1: Pattern matching (FREE)');
        console.log('  ✓ Level 2: AI analysis via OpenAI (~$0.01-0.02 per user)');
      } else {
        console.log('  ✓ Level 1: Pattern matching (FREE)');
        console.log('  ✗ Level 2: AI analysis (OPENAI_API_KEY not configured)');
      }
      if (GOOGLE_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
        console.log('  ✓ Level 3: LinkedIn search (100 free/day, then $5/1000)');
      } else {
        console.log('  ✗ Level 3: LinkedIn search (Google API not configured)');
      }
      console.log('');
      console.log(`Estimated time: ~${Math.ceil(stargazers.length * 0.5 / 60)} minutes for ${stargazers.length} users`);

      // Estimate cost
      let estimatedCost = 0;
      if (OPENAI_API_KEY) {
        estimatedCost += stargazers.length * 0.015; // ~$0.015 per user
      }
      if (GOOGLE_API_KEY && stargazers.length > 100) {
        estimatedCost += ((stargazers.length - 100) / 1000) * 5; // After 100 free
      }

      if (estimatedCost > 0) {
        console.log(`Estimated cost: ~$${estimatedCost.toFixed(2)}`);
      }
      console.log('='.repeat(60));
      console.log('');

      // Ask user
      const answer = readlineSync.question('Do you want to run the enrichment process? (y/n): ').toLowerCase();

      if (answer === 'y' || answer === 'yes') {
        shouldEnrich = true;
      } else {
        console.log('\n⏭️  Skipping enrichment. Will export GitHub data only.\n');
      }
    } else {
      console.log('\n⏭️  Skipping enrichment (API keys not configured)');
      console.log('To enable enrichment, add OPENAI_API_KEY and/or GOOGLE_API_KEY to .env\n');
    }

    // ENRICHMENT PHASE: Add role, seniority, company data
    if (shouldEnrich) {
      console.log('\n🔍 Starting enrichment process...\n');

      const enrichmentService = new EnrichmentService(
        OPENAI_API_KEY,
        GOOGLE_API_KEY,
        GOOGLE_SEARCH_ENGINE_ID
      );

      try {
        enrichedStargazers = await enrichmentService.enrichUsers(stargazers);
      } catch (error) {
        console.error('\n⚠️  Enrichment process stopped:', error.message);
        console.log('Continuing with partial data...\n');
      }
    }

    // Initialize Google Sheets service
    console.log('Initializing Google Sheets service...');
    const sheetsService = new SheetsService(CREDENTIALS_PATH, SPREADSHEET_ID);
    await sheetsService.initialize();

    // Export to Google Sheets
    console.log('\nExporting data to Google Sheets...');
    await sheetsService.exportStargazers(enrichedStargazers);

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
