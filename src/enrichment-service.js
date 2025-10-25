import { AIService } from './ai-service.js';
import { SearchService } from './search-service.js';

export class EnrichmentService {
  constructor(openaiApiKey, googleApiKey, googleSearchEngineId) {
    this.aiService = openaiApiKey ? new AIService(openaiApiKey) : null;
    this.searchService = (googleApiKey && googleSearchEngineId)
      ? new SearchService(googleApiKey, googleSearchEngineId)
      : null;

    this.stats = {
      level1Success: 0, // Pattern matching from existing data
      level2Success: 0, // AI analysis
      level3Success: 0, // LinkedIn search
      failed: 0,
    };
  }

  /**
   * Enrich a single user with role, seniority, company data
   * Uses 3-level cascade strategy
   * @param {Object} user - User object from GitHub
   * @returns {Promise<Object>} Enriched user data
   */
  async enrichUser(user) {
    console.log(`\n📊 Enriching: ${user.username}${user.name ? ` (${user.name})` : ''}`);

    const enrichedData = {
      ...user,
      role: null,
      seniority: null,
      enrichedCompany: null,
      linkedinProfiles: [],
      dataSource: null,
      confidence: 'low',
    };

    // LEVEL 1: Pattern matching from existing data
    console.log('  [Level 1] Checking existing data...');
    const level1Result = this.extractFromExistingData(user);

    if (this.isDataComplete(level1Result)) {
      console.log('  ✓ [Level 1] Complete data found from profile!');
      Object.assign(enrichedData, level1Result);
      enrichedData.dataSource = 'GitHub Profile (Pattern Matching)';
      enrichedData.confidence = level1Result.confidence;
      this.stats.level1Success++;
      return enrichedData;
    }

    // LEVEL 2: AI Analysis
    if (this.aiService) {
      console.log('  [Level 2] Running AI analysis...');
      try {
        const aiResult = await this.aiService.analyzeUser(user);

        // Merge AI results with Level 1 results (AI fills gaps)
        const mergedResult = this.mergeResults(level1Result, aiResult);

        if (this.isDataSufficient(mergedResult)) {
          console.log(`  ✓ [Level 2] AI analysis complete (confidence: ${aiResult.confidence})`);
          Object.assign(enrichedData, mergedResult);
          enrichedData.dataSource = level1Result.role || level1Result.company
            ? 'GitHub Profile + AI Analysis'
            : 'AI Analysis';
          enrichedData.confidence = aiResult.confidence;
          this.stats.level2Success++;
          return enrichedData;
        }
      } catch (error) {
        console.log(`  ⚠️  [Level 2] AI analysis failed: ${error.message}`);
      }
    } else {
      console.log('  ⏭️  [Level 2] Skipped (OpenAI API key not configured)');
    }

    // LEVEL 3: LinkedIn Search
    if (this.searchService) {
      console.log('  [Level 3] Searching LinkedIn...');
      try {
        const linkedinProfiles = await this.searchService.searchLinkedInProfiles(user);

        if (linkedinProfiles.length > 0) {
          console.log(`  ✓ [Level 3] Found ${linkedinProfiles.length} LinkedIn profile(s)`);

          // Store ALL LinkedIn profiles found
          enrichedData.linkedinProfiles = linkedinProfiles;

          // Use the first (most relevant) result to extract data
          const bestMatch = linkedinProfiles[0];
          if (bestMatch.extractedInfo.role || bestMatch.extractedInfo.company) {
            enrichedData.role = enrichedData.role || bestMatch.extractedInfo.role;
            enrichedData.seniority = enrichedData.seniority || this.extractSeniority(bestMatch.extractedInfo.role);
            enrichedData.enrichedCompany = enrichedData.enrichedCompany || bestMatch.extractedInfo.company;
            enrichedData.dataSource = 'LinkedIn Search';
            enrichedData.confidence = 'medium';
            this.stats.level3Success++;
            return enrichedData;
          }
        } else {
          console.log('  ✗ [Level 3] No LinkedIn profiles found');
        }
      } catch (error) {
        // User chose to skip or wait - this is expected
        if (error.message.includes('skip') || error.message.includes('wait')) {
          console.log('  ⏭️  [Level 3] Skipped by user choice');
          throw error; // Re-throw to stop processing more users
        }
        console.log(`  ⚠️  [Level 3] LinkedIn search failed: ${error.message}`);
      }
    } else {
      console.log('  ⏭️  [Level 3] Skipped (Google API not configured)');
    }

    // If we got here, use whatever data we have
    if (level1Result.role || level1Result.company) {
      Object.assign(enrichedData, level1Result);
      enrichedData.dataSource = 'Partial - GitHub Profile';
    }

    if (!enrichedData.role && !enrichedData.enrichedCompany) {
      console.log('  ✗ Unable to enrich user data');
      this.stats.failed++;
    }

    return enrichedData;
  }

  /**
   * LEVEL 1: Extract data from existing GitHub profile using pattern matching
   * @param {Object} user - User object
   * @returns {Object} Extracted data
   */
  extractFromExistingData(user) {
    const result = {
      role: null,
      seniority: null,
      company: null,
      confidence: 'medium',
    };

    // Check if blog URL contains LinkedIn
    if (user.blog && user.blog.includes('linkedin.com/in/')) {
      result.linkedinUrl = user.blog;
    }

    // Extract from bio using pattern matching
    if (user.bio) {
      const bio = user.bio.toLowerCase();

      // Common role patterns
      const rolePatterns = [
        { pattern: /software engineer|swe|developer|programmer/i, role: 'Software Engineer' },
        { pattern: /data scientist|ml engineer|machine learning/i, role: 'Data Scientist' },
        { pattern: /product manager|pm/i, role: 'Product Manager' },
        { pattern: /designer|ux|ui/i, role: 'Designer' },
        { pattern: /devops|sre|infrastructure/i, role: 'DevOps Engineer' },
        { pattern: /security engineer|infosec/i, role: 'Security Engineer' },
        { pattern: /frontend|front-end/i, role: 'Frontend Developer' },
        { pattern: /backend|back-end/i, role: 'Backend Developer' },
        { pattern: /fullstack|full-stack/i, role: 'Full Stack Developer' },
        { pattern: /mobile developer|ios|android/i, role: 'Mobile Developer' },
      ];

      for (const { pattern, role } of rolePatterns) {
        if (pattern.test(user.bio)) {
          result.role = role;
          break;
        }
      }

      // Extract seniority
      const seniorityPatterns = [
        { pattern: /\b(cto|chief technology officer)\b/i, seniority: 'CTO' },
        { pattern: /\b(vp|vice president)\b/i, seniority: 'VP' },
        { pattern: /\b(principal|distinguished)\b/i, seniority: 'Principal' },
        { pattern: /\b(staff|architect)\b/i, seniority: 'Staff' },
        { pattern: /\b(senior|sr\.?|lead)\b/i, seniority: 'Senior' },
        { pattern: /\b(mid|mid-level)\b/i, seniority: 'Mid-level' },
        { pattern: /\b(junior|jr\.?|entry)\b/i, seniority: 'Junior' },
      ];

      for (const { pattern, seniority } of seniorityPatterns) {
        if (pattern.test(user.bio)) {
          result.seniority = seniority;
          break;
        }
      }

      // Try to extract company from bio
      // Pattern: "at Company" or "@ Company"
      const companyMatch = user.bio.match(/(?:at|@)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s*[.|,]|\s*$)/);
      if (companyMatch) {
        result.company = companyMatch[1].trim();
      }
    }

    // Use GitHub company field if no company found in bio
    if (!result.company && user.company) {
      result.company = user.company.replace('@', '').trim();
    }

    return result;
  }

  /**
   * Extract seniority from role string
   * @param {string} roleString - Role string from LinkedIn
   * @returns {string|null} Seniority level
   */
  extractSeniority(roleString) {
    if (!roleString) return null;

    const lower = roleString.toLowerCase();

    if (/\b(cto|chief)\b/.test(lower)) return 'CTO';
    if (/\b(vp|vice president)\b/.test(lower)) return 'VP';
    if (/\b(principal|distinguished)\b/.test(lower)) return 'Principal';
    if (/\b(staff|architect)\b/.test(lower)) return 'Staff';
    if (/\b(senior|sr\.?|lead)\b/.test(lower)) return 'Senior';
    if (/\b(mid|mid-level)\b/.test(lower)) return 'Mid-level';
    if (/\b(junior|jr\.?|entry)\b/.test(lower)) return 'Junior';

    return null;
  }

  /**
   * Merge results from different levels (Level 1 + AI)
   * @param {Object} level1 - Level 1 results
   * @param {Object} aiResult - AI analysis results
   * @returns {Object} Merged results
   */
  mergeResults(level1, aiResult) {
    return {
      role: level1.role || aiResult.role,
      seniority: level1.seniority || aiResult.seniority,
      company: level1.company || aiResult.company,
      confidence: level1.role || level1.company ? 'high' : aiResult.confidence,
    };
  }

  /**
   * Check if data is complete (all fields present)
   * @param {Object} data - Data to check
   * @returns {boolean} True if complete
   */
  isDataComplete(data) {
    return !!(data.role && data.seniority && data.company);
  }

  /**
   * Check if data is sufficient (at least role or company)
   * @param {Object} data - Data to check
   * @returns {boolean} True if sufficient
   */
  isDataSufficient(data) {
    return !!(data.role || data.company);
  }

  /**
   * Enrich multiple users
   * @param {Array} users - Array of user objects
   * @returns {Promise<Array>} Array of enriched users
   */
  async enrichUsers(users) {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STARTING USER ENRICHMENT (3-LEVEL CASCADE)');
    console.log('='.repeat(60));
    console.log('Level 1: Pattern matching from GitHub data');
    console.log('Level 2: AI analysis with OpenAI');
    console.log('Level 3: LinkedIn search via Google');
    console.log('='.repeat(60) + '\n');

    const enrichedUsers = [];

    for (let i = 0; i < users.length; i++) {
      console.log(`\n[${i + 1}/${users.length}] ` + '='.repeat(50));

      try {
        const enriched = await this.enrichUser(users[i]);
        enrichedUsers.push(enriched);

        // Small delay between users
        await this.delay(300);
      } catch (error) {
        // If user chose to skip or wait, stop processing
        if (error.message.includes('skip') || error.message.includes('wait')) {
          console.log(`\n⏸️  Stopping enrichment. Processed ${enrichedUsers.length}/${users.length} users.`);
          // Add remaining users without enrichment
          for (let j = i + 1; j < users.length; j++) {
            enrichedUsers.push({
              ...users[j],
              role: null,
              seniority: null,
              enrichedCompany: null,
              linkedinProfiles: [],
              dataSource: 'Not processed',
              confidence: 'low',
            });
          }
          break;
        }

        // Other errors - continue with next user
        console.error(`\n❌ Error enriching user: ${error.message}`);
        enrichedUsers.push({
          ...users[i],
          role: null,
          seniority: null,
          enrichedCompany: null,
          linkedinProfiles: [],
          dataSource: 'Error',
          confidence: 'low',
        });
      }
    }

    this.printStats(enrichedUsers.length);

    return enrichedUsers;
  }

  /**
   * Print enrichment statistics
   * @param {number} total - Total users processed
   */
  printStats(total) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ENRICHMENT STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${total}`);
    console.log(`Level 1 success (pattern matching): ${this.stats.level1Success}`);
    console.log(`Level 2 success (AI analysis): ${this.stats.level2Success}`);
    console.log(`Level 3 success (LinkedIn search): ${this.stats.level3Success}`);
    console.log(`Failed to enrich: ${this.stats.failed}`);

    if (this.searchService) {
      const searchStats = this.searchService.getStats();
      console.log('\n📈 GOOGLE SEARCH STATISTICS');
      console.log(`Queries used: ${searchStats.queriesUsed}`);
      console.log(`Free queries remaining: ${searchStats.freeQueriesRemaining}`);
      if (!searchStats.inFreeTier) {
        console.log(`Estimated cost: $${searchStats.estimatedCost}`);
      }
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
