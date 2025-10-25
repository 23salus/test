import axios from 'axios';
import readlineSync from 'readline-sync';

export class SearchService {
  constructor(apiKey, searchEngineId) {
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
    this.queriesUsed = 0;
    this.freeQueryLimit = 100; // Google's free tier limit per day
    this.userApprovedPaid = false;
  }

  /**
   * Search for LinkedIn profiles using Google Custom Search API
   * @param {Object} user - User object with name, company, location
   * @returns {Promise<Array>} Array of LinkedIn profile results
   */
  async searchLinkedInProfiles(user) {
    // Build intelligent search query
    const query = this.buildSearchQuery(user);

    console.log(`  🔍 Searching LinkedIn: "${query}"`);

    try {
      // Check rate limiting before making the request
      await this.checkRateLimit();

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          num: 10, // Get up to 10 results (max allowed)
        },
      });

      this.queriesUsed++;

      // Extract LinkedIn profiles from results
      const profiles = this.extractLinkedInProfiles(response.data);

      console.log(`  ✓ Found ${profiles.length} LinkedIn profiles`);

      return profiles;
    } catch (error) {
      if (error.response?.status === 429) {
        console.error('  ⚠️  Rate limit exceeded. Waiting before retry...');
        throw new Error('Rate limit exceeded');
      }

      console.error(`  ✗ Search error: ${error.message}`);
      return [];
    }
  }

  /**
   * Build intelligent search query from user data
   * @param {Object} user - User object
   * @returns {string} Search query
   */
  buildSearchQuery(user) {
    const parts = ['site:linkedin.com/in'];

    // Add name in quotes for exact match
    if (user.name) {
      parts.push(`"${user.name}"`);
    } else if (user.username) {
      // Fallback to username if no name
      parts.push(`"${user.username}"`);
    }

    // Add company if available
    if (user.company) {
      // Clean company name (remove @ symbol often used in GitHub)
      const cleanCompany = user.company.replace('@', '').trim();
      parts.push(cleanCompany);
    }

    // Add location if available
    if (user.location) {
      parts.push(user.location);
    }

    return parts.join(' ');
  }

  /**
   * Extract LinkedIn profiles from Google Search results
   * @param {Object} data - Google Search API response
   * @returns {Array} Array of LinkedIn profile objects
   */
  extractLinkedInProfiles(data) {
    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items
      .filter(item => item.link && item.link.includes('linkedin.com/in/'))
      .map(item => ({
        url: item.link,
        title: item.title,
        snippet: item.snippet || '',
        // Try to extract role/company from title
        // Typical format: "Name - Role at Company | LinkedIn"
        extractedInfo: this.extractInfoFromTitle(item.title),
      }));
  }

  /**
   * Extract role and company from LinkedIn title
   * @param {string} title - LinkedIn page title
   * @returns {Object} Extracted role and company
   */
  extractInfoFromTitle(title) {
    // Pattern: "Name - Role at Company | LinkedIn"
    const match = title.match(/^([^-]+)-\s*(.+?)\s*(?:at|@)\s*(.+?)\s*[|\-]/i);

    if (match) {
      return {
        role: match[2]?.trim() || null,
        company: match[3]?.trim() || null,
      };
    }

    // Alternative pattern: "Name | Role | Company"
    const altMatch = title.match(/\|\s*([^|]+?)\s*\|\s*([^|]+)/);
    if (altMatch) {
      return {
        role: altMatch[1]?.trim() || null,
        company: altMatch[2]?.trim() || null,
      };
    }

    return {
      role: null,
      company: null,
    };
  }

  /**
   * Check if we've hit the rate limit and handle user interaction
   * @throws {Error} If user declines to continue
   */
  async checkRateLimit() {
    // If we haven't hit the limit, continue
    if (this.queriesUsed < this.freeQueryLimit) {
      return;
    }

    // If we've already asked and user approved, continue
    if (this.userApprovedPaid) {
      return;
    }

    // We've hit the limit - ask user what to do
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  FREE TIER LIMIT REACHED');
    console.log('='.repeat(60));
    console.log(`You've used ${this.queriesUsed} Google Search queries (free limit: ${this.freeQueryLimit}/day)`);
    console.log('\nOptions:');
    console.log('1. Continue with PAID queries (~$5 per 1000 queries)');
    console.log('2. Wait 24 hours for the free limit to reset');
    console.log('3. Skip LinkedIn search for remaining users (use only AI analysis)');
    console.log('='.repeat(60) + '\n');

    const choice = readlineSync.question('Enter your choice (1/2/3): ');

    if (choice === '1') {
      console.log('\n✓ Continuing with paid queries...\n');
      this.userApprovedPaid = true;
      return;
    } else if (choice === '2') {
      console.log('\n⏸️  Stopping here. Re-run the script in 24 hours to continue.\n');
      throw new Error('User chose to wait for rate limit reset');
    } else if (choice === '3') {
      console.log('\n⏭️  Skipping LinkedIn search for remaining users...\n');
      throw new Error('User chose to skip LinkedIn search');
    } else {
      console.log('\n⚠️  Invalid choice. Defaulting to skip LinkedIn search.\n');
      throw new Error('Invalid choice - skipping LinkedIn search');
    }
  }

  /**
   * Get statistics about queries used
   * @returns {Object} Query statistics
   */
  getStats() {
    return {
      queriesUsed: this.queriesUsed,
      freeQueriesRemaining: Math.max(0, this.freeQueryLimit - this.queriesUsed),
      inFreeTier: this.queriesUsed < this.freeQueryLimit,
      estimatedCost: this.queriesUsed > this.freeQueryLimit
        ? ((this.queriesUsed - this.freeQueryLimit) / 1000 * 5).toFixed(2)
        : 0,
    };
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
