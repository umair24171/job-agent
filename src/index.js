const gmail = require('./gmail');
const jobScraper = require('./jobs');
const sheets = require('./sheets');
const whatsapp = require('./whatsapp');
const autoApply = require('./apply');
require('dotenv').config();

class JobAgent {
  constructor() {
    this.stats = {
      jobsFound: 0,
      applied: 0,
      importantEmails: 0,
      errors: 0
    };
  }

  async checkEmails() {
    try {
      console.log('\n📧 Checking emails...');
      
      const importantEmails = await gmail.getImportantEmails();
      this.stats.importantEmails = importantEmails.length;

      if (importantEmails.length === 0) {
        console.log('📭 No important emails');
        return;
      }

      // Send ONE summary message instead of individual messages (Twilio trial = 5 msgs/day)
      const highPriority = importantEmails.filter(e => e.priority === 'HIGH');
      const medPriority = importantEmails.filter(e => e.priority === 'MEDIUM');

      let summary = `📧 EMAIL SUMMARY\n\n`;
      
      if (highPriority.length > 0) {
        summary += `🔴 HIGH PRIORITY (${highPriority.length}):\n`;
        highPriority.slice(0, 3).forEach(email => {
          summary += `\n• ${email.subject}\nFrom: ${email.from}\n`;
        });
        if (highPriority.length > 3) {
          summary += `\n...and ${highPriority.length - 3} more\n`;
        }
      }

      if (medPriority.length > 0) {
        summary += `\n🟡 MEDIUM (${medPriority.length}):\n`;
        medPriority.slice(0, 2).forEach(email => {
          summary += `\n• ${email.subject}\n`;
        });
        if (medPriority.length > 2) {
          summary += `\n...and ${medPriority.length - 2} more\n`;
        }
      }

      summary += `\n⏰ ${new Date().toLocaleString()}`;

      await whatsapp.sendMessage(summary);

      // Mark all as read
      for (const email of importantEmails) {
        await gmail.markAsRead(email.id);
      }

      console.log(`✅ Processed ${importantEmails.length} important emails`);
    } catch (error) {
      console.error('❌ Email check error:', error.message);
      this.stats.errors++;
    }
  }

  async searchAndApplyJobs() {
    try {
      console.log('\n🔍 Searching for jobs...');
      
      // Search jobs
      const jobs = await jobScraper.searchAllJobs();
      this.stats.jobsFound = jobs.length;

      if (jobs.length === 0) {
        console.log('No jobs found matching criteria');
        return;
      }

      // Filter out jobs we've already applied to
      const newJobs = [];
      for (const job of jobs) {
        const alreadyApplied = await sheets.checkIfApplied(job.link);
        if (!alreadyApplied) {
          newJobs.push(job);
        }
      }

      console.log(`📋 Found ${newJobs.length} new jobs (${jobs.length - newJobs.length} already logged)`);

      if (newJobs.length === 0) {
        return;
      }

      // Log all jobs to Google Sheets (auto-apply disabled)
      console.log('\n📝 Logging jobs to Google Sheets...');
      
      for (const job of newJobs) {
        job.applied = false;
        job.status = 'Found - Manual Apply';
        await sheets.logJob(job);
      }

      // Send ONE summary message for all jobs
      if (newJobs.length > 0) {
        let jobSummary = `🎯 JOB ALERT!\n\n`;
        jobSummary += `📋 Found ${newJobs.length} new jobs!\n\n`;

        // Show top 5 jobs
        const topJobs = newJobs.slice(0, 5);
        topJobs.forEach((job, i) => {
          jobSummary += `${i + 1}. ${job.title}\n   ${job.company} - ${job.location}\n\n`;
        });

        if (newJobs.length > 5) {
          jobSummary += `...and ${newJobs.length - 5} more!\n\n`;
        }

        jobSummary += `⏰ ${new Date().toLocaleString()}\n`;
        jobSummary += `Check Google Sheet for full list!`;

        await whatsapp.sendMessage(jobSummary);
      }

      console.log(`\n✅ Logged ${newJobs.length} jobs to Google Sheet`);
      console.log(`📱 Apply manually from: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`);

    } catch (error) {
      console.error('❌ Job search error:', error.message);
      this.stats.errors++;
      await whatsapp.sendError(error);
    }
  }

  async sendDailySummary() {
    try {
      await whatsapp.sendDailySummary(this.stats);
    } catch (error) {
      console.error('❌ Summary error:', error.message);
    }
  }

  async run() {
    console.log('🚀 Job Agent Started');
    console.log(`⏰ ${new Date().toLocaleString()}\n`);

    try {
      // Initialize Google Sheets
      await sheets.initialize();

      // Check emails
      await this.checkEmails();

      // Search and apply to jobs
      await this.searchAndApplyJobs();

      // Send daily summary
      await this.sendDailySummary();

      console.log('\n✅ Agent run completed successfully!');
      console.log(`📊 Stats: ${JSON.stringify(this.stats, null, 2)}`);

    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      await whatsapp.sendError(error);
    }

    process.exit(0);
  }
}

// Run the agent
const agent = new JobAgent();
agent.run();