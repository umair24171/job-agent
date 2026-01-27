const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

class SheetsLogger {
  constructor() {
    this.sheetId = process.env.GOOGLE_SHEET_ID;
    this.doc = null;
    this.sheet = null;
  }

  async initialize() {
    try {
      const { JWT } = require('google-auth-library');
      
      const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.doc = new GoogleSpreadsheet(this.sheetId, serviceAccountAuth);
      await this.doc.loadInfo();
      
      // Get the first sheet
      this.sheet = this.doc.sheetsByIndex[0];
      
      if (!this.sheet) {
        // Create new sheet if none exists
        this.sheet = await this.doc.addSheet({ 
          headerValues: [
            'Date',
            'Company',
            'Title',
            'Location',
            'Salary',
            'Link',
            'Applied',
            'Status',
            'Source'
          ]
        });
      } else {
        // Check if headers exist, if not add them
        await this.sheet.loadHeaderRow();
        if (!this.sheet.headerValues || this.sheet.headerValues.length === 0) {
          await this.sheet.setHeaderRow([
            'Date',
            'Company',
            'Title',
            'Location',
            'Salary',
            'Link',
            'Applied',
            'Status',
            'Source'
          ]);
        }
      }

      console.log('✅ Google Sheets initialized');
      return true;
    } catch (error) {
      console.error('❌ Sheets initialization error:', error.message);
      return false;
    }
  }

  async logJob(job) {
    try {
      if (!this.sheet) {
        await this.initialize();
      }

      await this.sheet.addRow({
        Date: new Date().toISOString(),
        Company: job.company || 'N/A',
        Title: job.title || 'N/A',
        Location: job.location || 'N/A',
        Salary: job.salary || 'N/A',
        Link: job.link || 'N/A',
        Applied: job.applied ? 'Yes' : 'No',
        Status: job.status || 'Found',
        Source: job.source || 'Unknown'
      });

      console.log(`📝 Logged: ${job.title} at ${job.company}`);
      return true;
    } catch (error) {
      console.error('❌ Error logging to sheet:', error.message);
      return false;
    }
  }

  async updateJobStatus(jobLink, status) {
    try {
      if (!this.sheet) {
        await this.initialize();
      }

      const rows = await this.sheet.getRows();
      const row = rows.find(r => r.Link === jobLink);

      if (row) {
        row.Status = status;
        await row.save();
        console.log(`✅ Updated job status: ${status}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error updating status:', error.message);
      return false;
    }
  }

  async getAppliedJobs() {
    try {
      if (!this.sheet) {
        await this.initialize();
      }

      const rows = await this.sheet.getRows();
      return rows
        .filter(row => row.Applied === 'Yes')
        .map(row => ({
          company: row.Company,
          title: row.Title,
          date: row.Date,
          link: row.Link
        }));
    } catch (error) {
      console.error('❌ Error getting applied jobs:', error.message);
      return [];
    }
  }

  async checkIfApplied(jobLink) {
    try {
      if (!this.sheet) {
        await this.initialize();
      }

      const rows = await this.sheet.getRows();
      return rows.some(row => row.Link === jobLink);
    } catch (error) {
      console.error('❌ Error checking applied status:', error.message);
      return false;
    }
  }
}

module.exports = new SheetsLogger();