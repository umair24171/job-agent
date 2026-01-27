const { google } = require('googleapis');
const keywords = require('../config/keywords.json');
require('dotenv').config();

class GmailManager {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async getUnreadEmails() {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 50
      });

      if (!response.data.messages) {
        console.log('📭 No unread emails');
        return [];
      }

      const emails = [];
      for (const message of response.data.messages) {
        const email = await this.getEmailDetails(message.id);
        emails.push(email);
      }

      console.log(`📧 Found ${emails.length} unread emails`);
      return emails;
    } catch (error) {
      console.error('❌ Gmail error:', error.message);
      return [];
    }
  }

  async getEmailDetails(messageId) {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const headers = response.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    let body = '';
    if (response.data.payload.body.data) {
      body = Buffer.from(response.data.payload.body.data, 'base64').toString();
    } else if (response.data.payload.parts) {
      const textPart = response.data.payload.parts.find(
        part => part.mimeType === 'text/plain'
      );
      if (textPart?.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }

    const snippet = response.data.snippet;

    return {
      id: messageId,
      subject,
      from,
      date,
      body,
      snippet,
      priority: this.calculatePriority(subject, body, snippet)
    };
  }

  calculatePriority(subject, body, snippet) {
    const text = `${subject} ${body} ${snippet}`.toLowerCase();
    
    const { importantEmailKeywords } = keywords;

    // Check high priority
    for (const keyword of importantEmailKeywords.high) {
      if (text.includes(keyword.toLowerCase())) {
        return 'HIGH';
      }
    }

    // Check medium priority
    for (const keyword of importantEmailKeywords.medium) {
      if (text.includes(keyword.toLowerCase())) {
        return 'MEDIUM';
      }
    }

    // Check if it's job-related
    if (text.includes('job') || text.includes('application') || text.includes('position')) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      return true;
    } catch (error) {
      console.error('❌ Error marking as read:', error.message);
      return false;
    }
  }

  async getImportantEmails() {
    const emails = await this.getUnreadEmails();
    const important = emails.filter(email => 
      email.priority === 'HIGH' || email.priority === 'MEDIUM'
    );

    console.log(`🔥 ${important.length} important emails found`);
    return important;
  }
}

module.exports = new GmailManager();