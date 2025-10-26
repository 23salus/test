import { Octokit } from '@octokit/rest';

export class GitHubService {
  constructor(token) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'github-stars-scraper v1.0.0',
    });
  }

  /**
   * Fetch all stargazers for a given repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} Array of stargazers with detailed information
   */
  async fetchStargazers(owner, repo) {
    console.log(`Fetching stargazers for ${owner}/${repo}...`);

    const stargazers = [];
    let page = 1;
    const perPage = 100;

    try {
      while (true) {
        console.log(`Fetching page ${page}...`);

        const response = await this.octokit.activity.listStargazersForRepo({
          owner,
          repo,
          per_page: perPage,
          page,
        });

        if (response.data.length === 0) {
          break;
        }

        stargazers.push(...response.data);

        console.log(`Retrieved ${stargazers.length} stargazers so far...`);

        // Check if we've reached the last page
        if (response.data.length < perPage) {
          break;
        }

        page++;

        // Add a small delay to avoid rate limiting
        await this.delay(100);
      }

      console.log(`Total stargazers found: ${stargazers.length}`);
      return stargazers;
    } catch (error) {
      console.error('Error fetching stargazers:', error.message);
      throw error;
    }
  }

  /**
   * Fetch detailed user information including social accounts
   * @param {string} username - GitHub username
   * @returns {Promise<Object>} User details with social accounts
   */
  async fetchUserDetails(username) {
    try {
      const response = await this.octokit.users.getByUsername({
        username,
      });

      const user = response.data;

      // Extract social accounts from the profile
      const socialAccounts = this.extractSocialAccounts(user);

      return {
        username: user.login,
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        company: user.company || '',
        location: user.location || '',
        blog: user.blog || '',
        twitter: user.twitter_username || '',
        followers: user.followers || 0,
        following: user.following || 0,
        publicRepos: user.public_repos || 0,
        profileUrl: user.html_url,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        // Social accounts from sidebar
        socialAccounts: socialAccounts,
        linkedinUrl: socialAccounts.linkedin || null,
        twitterUrl: socialAccounts.twitter || null,
        mastodonUrl: socialAccounts.mastodon || null,
        otherSocial: socialAccounts.other || [],
      };
    } catch (error) {
      console.error(`Error fetching details for user ${username}:`, error.message);
      // Return basic info if detailed fetch fails
      return {
        username,
        name: '',
        email: '',
        bio: '',
        company: '',
        location: '',
        blog: '',
        twitter: '',
        followers: 0,
        following: 0,
        publicRepos: 0,
        profileUrl: `https://github.com/${username}`,
        avatarUrl: '',
        createdAt: '',
        socialAccounts: {},
        linkedinUrl: null,
        twitterUrl: null,
        mastodonUrl: null,
        otherSocial: [],
      };
    }
  }

  /**
   * Extract social accounts from user profile
   * Checks both the social_accounts array and the blog field
   * @param {Object} user - User object from GitHub API
   * @returns {Object} Organized social accounts
   */
  extractSocialAccounts(user) {
    const accounts = {
      linkedin: null,
      twitter: null,
      mastodon: null,
      other: [],
    };

    // Check social_accounts array (from sidebar)
    if (user.social_accounts && Array.isArray(user.social_accounts)) {
      for (const account of user.social_accounts) {
        const url = account.url || account.provider;

        if (url && url.includes('linkedin.com')) {
          accounts.linkedin = url;
        } else if (url && (url.includes('twitter.com') || url.includes('x.com'))) {
          accounts.twitter = url;
        } else if (url && url.includes('mastodon')) {
          accounts.mastodon = url;
        } else if (url) {
          accounts.other.push(url);
        }
      }
    }

    // Also check the blog field (many users put LinkedIn here)
    if (user.blog) {
      const blog = user.blog.toLowerCase();
      if (blog.includes('linkedin.com') && !accounts.linkedin) {
        accounts.linkedin = user.blog;
      } else if ((blog.includes('twitter.com') || blog.includes('x.com')) && !accounts.twitter) {
        accounts.twitter = user.blog;
      } else if (blog.includes('mastodon') && !accounts.mastodon) {
        accounts.mastodon = user.blog;
      }
    }

    return accounts;
  }

  /**
   * Fetch all stargazers with their detailed information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} Array of stargazers with detailed social information
   */
  async fetchStargazersWithDetails(owner, repo) {
    const stargazers = await this.fetchStargazers(owner, repo);
    const detailedStargazers = [];

    console.log('\nFetching detailed user information...');

    for (let i = 0; i < stargazers.length; i++) {
      const stargazer = stargazers[i];
      console.log(`Processing user ${i + 1}/${stargazers.length}: ${stargazer.login}`);

      const userDetails = await this.fetchUserDetails(stargazer.login);
      detailedStargazers.push(userDetails);

      // Add a delay to avoid rate limiting
      await this.delay(200);
    }

    return detailedStargazers;
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
