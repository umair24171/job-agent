const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
require('dotenv').config();

puppeteer.use(StealthPlugin());

class AutoApply {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1920x1080'
        ]
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });
      console.log('✅ Apply browser initialized');
      return true;
    } catch (error) {
      console.error('❌ Apply browser init error:', error.message);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async loginLinkedIn() {
    try {
      await this.page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });

      await this.page.type('#username', process.env.LINKEDIN_EMAIL);
      await this.page.type('#password', process.env.LINKEDIN_PASSWORD);
      await this.page.click('button[type="submit"]');

      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

      // Check if login was successful
      const url = this.page.url();
      if (url.includes('/feed') || url.includes('/jobs')) {
        console.log('✅ LinkedIn login successful');
        this.isLoggedIn = true;
        return true;
      }

      console.log('⚠️ LinkedIn login may have failed - check for CAPTCHA');
      return false;
    } catch (error) {
      console.error('❌ LinkedIn login error:', error.message);
      return false;
    }
  }

  async applyToLinkedInJob(jobUrl) {
    try {
      if (!this.isLoggedIn) {
        await this.loginLinkedIn();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await this.page.goto(jobUrl, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if Easy Apply button exists
      const easyApplyButton = await this.page.$('.jobs-apply-button--top-card button');
      
      if (!easyApplyButton) {
        console.log('⚠️ No Easy Apply button found');
        return { success: false, reason: 'No Easy Apply' };
      }

      // Click Easy Apply
      await easyApplyButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Handle the application modal
      let currentStep = 1;
      const maxSteps = 10;

      while (currentStep <= maxSteps) {
        try {
          // Try to auto-fill common questions
          await this.autoFillCommonFields();

          // Check if there's a "Next" button
          const nextButton = await this.page.$('button[aria-label="Continue to next step"]');
          
          if (nextButton) {
            const isEnabled = await nextButton.evaluate(btn => !btn.disabled);
            
            if (!isEnabled) {
              console.log('⚠️ Next button disabled - likely has required custom questions');
              return { success: false, reason: 'Requires custom answers' };
            }

            await nextButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            currentStep++;
            continue;
          }

          // Check for "Review" button (final step before submit)
          const reviewButton = await this.page.$('button[aria-label="Review your application"]');
          if (reviewButton) {
            await reviewButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          // Check for Submit button
          const submitButton = await this.page.$('button[aria-label="Submit application"]');
          
          if (submitButton) {
            await submitButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('✅ Application submitted successfully!');
            return { success: true, reason: 'Applied' };
          }

          // If neither button exists, we're stuck
          break;
        } catch (err) {
          console.error('Error in application flow:', err.message);
          break;
        }
      }

      return { success: false, reason: 'Could not complete application' };
    } catch (error) {
      console.error('❌ Apply error:', error.message);
      return { success: false, reason: error.message };
    }
  }

  async applyToMultipleJobs(jobs) {
    await this.initialize();
    
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Try ALL LinkedIn jobs, not just Easy Apply ones (detection might be imperfect)
    const linkedInJobs = jobs.filter(job => job.source === 'LinkedIn');

    console.log(`🎯 Attempting to apply to ${linkedInJobs.length} LinkedIn jobs`);

    for (const job of linkedInJobs) {
      console.log(`\n📝 Applying to: ${job.title} at ${job.company}`);
      
      const result = await this.applyToLinkedInJob(job.link);
      
      if (result.success) {
        results.successful.push({ ...job, appliedAt: new Date() });
      } else if (result.reason === 'Requires custom answers' || result.reason === 'No Easy Apply') {
        results.skipped.push({ ...job, reason: result.reason });
      } else {
        results.failed.push({ ...job, reason: result.reason });
      }

      // Rate limiting - wait between applications
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Stop after 5 attempts to avoid getting blocked
      if (results.successful.length + results.skipped.length >= 5) {
        console.log('\n⏸️ Pausing after 5 attempts to avoid rate limiting');
        break;
      }
    }

    await this.close();

    console.log(`\n✅ Successfully applied: ${results.successful.length}`);
    console.log(`⏭️ Skipped (needs manual): ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    return results;
  }
}

module.exports = new AutoApply();