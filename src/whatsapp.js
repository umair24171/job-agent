const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class WhatsAppNotifier {
  constructor() {
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM; // Format: whatsapp:+14155238886
    this.toNumber = process.env.TWILIO_WHATSAPP_TO;     // Format: whatsapp:+923001234567
  }

  async sendMessage(message, options = {}) {
    try {
      await client.messages.create({
        from: this.fromNumber,
        to: this.toNumber,
        body: message
      });
      console.log('✅ WhatsApp notification sent');
      return true;
    } catch (error) {
      console.error('❌ WhatsApp error:', error.message);
      return false;
    }
  }

  async sendJobNotification(job) {
    const message = `
🎯 NEW JOB FOUND!

Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Salary: ${job.salary || 'Not specified'}

Applied: ${job.applied ? '✅ Yes (Auto)' : '⏳ Pending'}

🔗 Link: ${job.link}
    `.trim();

    return this.sendMessage(message);
  }

  async sendImportantEmail(email) {
    const message = `
📧 IMPORTANT EMAIL!

From: ${email.from}
Subject: ${email.subject}
Priority: ${email.priority}

Preview: ${email.snippet}

⏰ ${new Date(email.date).toLocaleString()}
    `.trim();

    return this.sendMessage(message);
  }

  async sendDailySummary(stats) {
    const message = `
📊 DAILY SUMMARY

🔍 Jobs Found: ${stats.jobsFound}
✅ Applied: ${stats.applied}
📧 Important Emails: ${stats.importantEmails}
⏰ ${new Date().toLocaleDateString()}

Keep grinding bro! 💪
    `.trim();

    return this.sendMessage(message);
  }

  async sendError(error) {
    const message = `
⚠️ AGENT ERROR

${error.message}

Check logs for details.
    `.trim();

    return this.sendMessage(message);
  }
}

module.exports = new WhatsAppNotifier();