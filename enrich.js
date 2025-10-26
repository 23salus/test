import dotenv from 'dotenv';
import fs from 'fs';
import readlineSync from 'readline-sync';
import { EnrichmentService } from './src/enrichment-service.js';
import { SheetsService } from './src/sheets-service.js';

// Load environment variables
dotenv.config();

// Configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './credentials.json';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const CACHE_FILE = './.stargazers-cache.json';

/**
 * Main function to run enrichment on cached data
 */
async function main() {
  console.log('===========================================');
  console.log('GitHub Stars Scraper - ENRICH PHASE');
  console.log('===========================================\n');

  try {
    // Check for cache file
    if (!fs.existsSync(CACHE_FILE)) {
      throw new Error(
        `Cache file not found! Run "npm start" first to fetch GitHub data.\n` +
        `Expected file: ${CACHE_FILE}`
      );
    }

    // Load cached data
    console.log('Loading cached stargazers data...');
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const stargazers = cache.stargazers;
    console.log(`✓ Loaded ${stargazers.length} stargazers from cache`);
    console.log(`  Repository: ${cache.repository}`);
    console.log(`  Fetched at: ${cache.fetchedAt}\n`);

    // Check if enrichment is possible
    if (!OPENAI_API_KEY && !GOOGLE_API_KEY) {
      throw new Error(
        'No enrichment API keys configured!\n' +
        'Add OPENAI_API_KEY and/or GOOGLE_API_KEY to your .env file.'
      );
    }

    // Show enrichment info
    console.log('='.repeat(60));
    console.log('ENRICHMENT CONFIGURATION');
    console.log('='.repeat(60));
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

    // Calculate users that already have LinkedIn
    const alreadyHaveLinkedIn = stargazers.filter(u => u.linkedinUrl).length;
    const needLinkedInSearch = stargazers.length - alreadyHaveLinkedIn;

    console.log(`Users with LinkedIn from GitHub: ${alreadyHaveLinkedIn}`);
    console.log(`Users needing LinkedIn search: ${needLinkedInSearch}`);
    console.log('');
    console.log(`Estimated time: ~${Math.ceil(stargazers.length * 0.5 / 60)} minutes`);

    // Estimate cost
    let estimatedCost = 0;
    if (OPENAI_API_KEY) {
      estimatedCost += stargazers.length * 0.015;
    }
    if (GOOGLE_API_KEY && needLinkedInSearch > 100) {
      estimatedCost += ((needLinkedInSearch - 100) / 1000) * 5;
    }

    if (estimatedCost > 0) {
      console.log(`Estimated cost: ~$${estimatedCost.toFixed(2)}`);
    }
    console.log('='.repeat(60));
    console.log('');

    // Ask for confirmation
    const answer = readlineSync.question('Start enrichment process? (y/n): ').toLowerCase();

    if (answer !== 'y' && answer !== 'yes') {
      console.log('\n⏭️  Enrichment cancelled.\n');
      process.exit(0);
    }

    // Run enrichment
    console.log('\n🔍 Starting enrichment process...\n');

    const enrichmentService = new EnrichmentService(
      OPENAI_API_KEY,
      GOOGLE_API_KEY,
      GOOGLE_SEARCH_ENGINE_ID
    );

    const enrichedStargazers = await enrichmentService.enrichUsers(stargazers);

    // Update Google Sheets
    console.log('\nUpdating Google Sheets with enriched data...');
    const sheetsService = new SheetsService(CREDENTIALS_PATH, SPREADSHEET_ID);
    await sheetsService.initialize();
    await sheetsService.exportStargazers(enrichedStargazers);

    console.log('\n===========================================');
    console.log('✓ ENRICH PHASE completed successfully!');
    console.log('===========================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('Cache file not found')) {
      console.error('\n💡 TIP: Run "npm start" first to fetch data from GitHub.');
    }

    process.exit(1);
  }
}

// Run enrichment
main();
