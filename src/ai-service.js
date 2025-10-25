import OpenAI from 'openai';

export class AIService {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze user data and infer role, seniority, and company
   * @param {Object} user - User object with GitHub data
   * @returns {Promise<Object>} Analyzed data with role, seniority, company, confidence
   */
  async analyzeUser(user) {
    try {
      const prompt = this.buildAnalysisPrompt(user);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // More cost-effective model
        messages: [
          {
            role: 'system',
            content: `You are an expert HR analyst. Analyze GitHub profiles and extract professional information.
Your task is to infer:
- Role (e.g., Software Engineer, Product Manager, Data Scientist, Designer, etc.)
- Seniority (e.g., Junior, Mid-level, Senior, Staff, Principal, Lead, CTO, etc.)
- Current Company name

Return ONLY a valid JSON object with this exact structure:
{
  "role": "string or null",
  "seniority": "string or null",
  "company": "string or null",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation"
}

Rules:
- Be conservative: if unsure, return null
- Normalize role names (e.g., "SWE" → "Software Engineer")
- Infer seniority from: years of experience, leadership indicators, project complexity
- Use "high" confidence only when explicit information is available
- Keep reasoning under 50 words`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content);

      return {
        role: result.role || null,
        seniority: result.seniority || null,
        company: result.company || null,
        confidence: result.confidence || 'low',
        reasoning: result.reasoning || '',
        source: 'AI Analysis',
      };
    } catch (error) {
      console.error(`Error analyzing user ${user.username}:`, error.message);
      return {
        role: null,
        seniority: null,
        company: null,
        confidence: 'low',
        reasoning: 'Analysis failed',
        source: 'AI Analysis',
      };
    }
  }

  /**
   * Build analysis prompt from user data
   * @param {Object} user - User object
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(user) {
    const parts = [];

    parts.push(`GitHub Username: ${user.username}`);

    if (user.name) {
      parts.push(`Name: ${user.name}`);
    }

    if (user.bio) {
      parts.push(`Bio: ${user.bio}`);
    }

    if (user.company) {
      parts.push(`Company (from profile): ${user.company}`);
    }

    if (user.location) {
      parts.push(`Location: ${user.location}`);
    }

    if (user.blog) {
      parts.push(`Website/Blog: ${user.blog}`);
    }

    if (user.twitter) {
      parts.push(`Twitter: @${user.twitter}`);
    }

    parts.push(`Public Repositories: ${user.publicRepos}`);
    parts.push(`Followers: ${user.followers}`);
    parts.push(`Following: ${user.following}`);

    if (user.createdAt) {
      const accountAge = this.calculateAccountAge(user.createdAt);
      parts.push(`Account Age: ${accountAge} years`);
    }

    return parts.join('\n');
  }

  /**
   * Calculate account age in years
   * @param {string} createdAt - ISO date string
   * @returns {number} Age in years
   */
  calculateAccountAge(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const ageInYears = (now - created) / (1000 * 60 * 60 * 24 * 365);
    return Math.round(ageInYears * 10) / 10; // Round to 1 decimal
  }

  /**
   * Batch analyze multiple users
   * @param {Array} users - Array of user objects
   * @param {Function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Array>} Array of analyzed users
   */
  async analyzeUsers(users, progressCallback = null) {
    const results = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      if (progressCallback) {
        progressCallback(i + 1, users.length, user.username);
      }

      const analysis = await this.analyzeUser(user);
      results.push(analysis);

      // Small delay to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
