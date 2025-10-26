import { google } from 'googleapis';
import fs from 'fs';

export class SheetsService {
  constructor(credentialsPath, spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.credentialsPath = credentialsPath;
    this.sheets = null;
  }

  /**
   * Initialize the Google Sheets API client
   */
  async initialize() {
    try {
      // Read the service account credentials
      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));

      // Create JWT client
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Initialize the sheets API
      this.sheets = google.sheets({ version: 'v4', auth });

      console.log('Google Sheets API initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets API:', error.message);
      throw error;
    }
  }

  /**
   * Create or clear the sheet and add headers
   * @param {string} sheetName - Name of the sheet
   */
  async prepareSheet(sheetName = 'Stargazers') {
    try {
      // Try to clear existing sheet or create new one
      try {
        // Clear the sheet if it exists
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:Z`,
        });
        console.log(`Cleared existing sheet: ${sheetName}`);
      } catch (error) {
        // Sheet might not exist, try to create it
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });
        console.log(`Created new sheet: ${sheetName}`);
      }

      // Add headers
      const headers = [
        'Username',
        'Name',
        'Email',
        'Company (GitHub)',
        'Location',
        'Bio',
        'Blog/Website',
        'Twitter Username',
        'Followers',
        'Following',
        'Public Repos',
        'Profile URL',
        'Avatar URL',
        'Account Created',
        // Social accounts from GitHub profile sidebar
        'LinkedIn URL (GitHub)',
        'Twitter URL (GitHub)',
        'Other Social (GitHub)',
        // Enriched data columns
        'Role',
        'Seniority',
        'Company (Enriched)',
        'LinkedIn Profiles (Search)',
        'Data Source',
        'Confidence',
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:W1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      // Format headers (bold)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: await this.getSheetId(sheetName),
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat.textFormat.bold',
              },
            },
          ],
        },
      });

      console.log('Sheet prepared with headers');
    } catch (error) {
      console.error('Error preparing sheet:', error.message);
      throw error;
    }
  }

  /**
   * Format LinkedIn profiles array as a string for Google Sheets
   * @param {Array} profiles - Array of LinkedIn profile objects
   * @returns {string} Formatted string
   */
  formatLinkedInProfiles(profiles) {
    if (!profiles || profiles.length === 0) {
      return '';
    }

    // Return all URLs separated by newlines (Google Sheets will show them in the cell)
    return profiles.map(p => p.url).join('\n');
  }

  /**
   * Format other social accounts array as a string for Google Sheets
   * @param {Array} socials - Array of social account objects or URLs
   * @returns {string} Formatted string
   */
  formatOtherSocial(socials) {
    if (!socials || socials.length === 0) {
      return '';
    }

    // Handle both old format (strings) and new format (objects with provider/url)
    return socials.map(social => {
      if (typeof social === 'string') {
        return social;
      }
      // New format: {provider: 'youtube', url: 'https://...'}
      return social.provider ? `${social.provider}: ${social.url}` : social.url;
    }).join('\n');
  }

  /**
   * Get the sheet ID by name
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<number>} Sheet ID
   */
  async getSheetId(sheetName) {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });

    const sheet = response.data.sheets.find(
      s => s.properties.title === sheetName
    );

    return sheet ? sheet.properties.sheetId : 0;
  }

  /**
   * Write stargazers data to the sheet
   * @param {Array} stargazers - Array of stargazer objects
   * @param {string} sheetName - Name of the sheet
   */
  async writeStargazers(stargazers, sheetName = 'Stargazers') {
    try {
      console.log(`Writing ${stargazers.length} stargazers to sheet...`);

      // Convert stargazers to rows
      const rows = stargazers.map(user => [
        user.username,
        user.name,
        user.email,
        user.company,
        user.location,
        user.bio,
        user.blog,
        user.twitter,
        user.followers,
        user.following,
        user.publicRepos,
        user.profileUrl,
        user.avatarUrl,
        user.createdAt,
        // Social accounts from GitHub profile
        user.linkedinUrl || '',
        user.twitterUrl || '',
        this.formatOtherSocial(user.otherSocial),
        // Enriched data
        user.role || '',
        user.seniority || '',
        user.enrichedCompany || '',
        this.formatLinkedInProfiles(user.linkedinProfiles),
        user.dataSource || '',
        user.confidence || '',
      ]);

      // Write data in batches to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const startRow = i + 2; // +2 because of 1-indexed and header row
        const endRow = startRow + batch.length - 1;

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A${startRow}:W${endRow}`,
          valueInputOption: 'RAW',
          resource: {
            values: batch,
          },
        });

        console.log(`Wrote rows ${startRow} to ${endRow}`);
      }

      console.log('All data written successfully!');
    } catch (error) {
      console.error('Error writing to sheet:', error.message);
      throw error;
    }
  }

  /**
   * Complete workflow: prepare sheet and write data
   * @param {Array} stargazers - Array of stargazer objects
   * @param {string} sheetName - Name of the sheet
   */
  async exportStargazers(stargazers, sheetName = 'Stargazers') {
    await this.prepareSheet(sheetName);
    await this.writeStargazers(stargazers, sheetName);
    console.log(`\nExport complete! View your spreadsheet at:`);
    console.log(`https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`);
  }
}
