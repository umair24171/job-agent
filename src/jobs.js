const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const keywords = require('../config/keywords.json');
require('dotenv').config();

puppeteer.use(StealthPlugin());

class JobScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });
      console.log('✅ Browser initialized');
      return true;
    } catch (error) {
      console.error('❌ Browser init error:', error.message);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrapeLinkedInJobs(keyword, location = 'remote') {
    try {
      const jobs = [];
      const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&f_TPR=r86400&f_AL=true`;

      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract job listings
      const jobElements = await this.page.$$('.base-card');

      for (const element of jobElements.slice(0, 10)) {
        try {
          const title = await element.$eval('.base-search-card__title', el => el.textContent.trim());
          const company = await element.$eval('.base-search-card__subtitle', el => el.textContent.trim());
          const location = await element.$eval('.job-search-card__location', el => el.textContent.trim());
          const link = await element.$eval('a', el => el.href);

          // Better Easy Apply detection - check multiple selectors
          let hasEasyApply = false;
          try {
            hasEasyApply = await element.evaluate(el => {
              const text = el.textContent.toLowerCase();
              return text.includes('easy apply') || 
                     el.querySelector('.job-card-container__apply-method') !== null ||
                     el.querySelector('[aria-label*="Easy Apply"]') !== null;
            });
          } catch (e) {
            // If detection fails, assume it might be Easy Apply
            hasEasyApply = false;
          }

          jobs.push({
            title,
            company,
            location,
            link,
            source: 'LinkedIn',
            easyApply: hasEasyApply,
            salary: null,
            applied: false
          });
        } catch (err) {
          // Skip if can't extract data
          continue;
        }
      }

      console.log(`🔍 LinkedIn: Found ${jobs.length} jobs for "${keyword}"`);
      return jobs;
    } catch (error) {
      console.error('❌ LinkedIn scraping error:', error.message);
      return [];
    }
  }

  async scrapeIndeedJobs(keyword, location = 'remote') {
    try {
      const jobs = [];
      const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&fromage=1`;

      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract job listings
      const jobElements = await this.page.$$('.job_seen_beacon');

      for (const element of jobElements.slice(0, 10)) {
        try {
          const title = await element.$eval('h2.jobTitle', el => el.textContent.trim());
          const company = await element.$eval('[data-testid="company-name"]', el => el.textContent.trim());
          
          let location = 'Remote';
          try {
            location = await element.$eval('[data-testid="text-location"]', el => el.textContent.trim());
          } catch (e) {}

          let salary = null;
          try {
            salary = await element.$eval('.metadata.salary-snippet-container', el => el.textContent.trim());
          } catch (e) {}

          const linkElement = await element.$('h2.jobTitle a');
          const relativeLink = await linkElement.evaluate(el => el.getAttribute('href'));
          const link = `https://www.indeed.com${relativeLink}`;

          jobs.push({
            title,
            company,
            location,
            link,
            source: 'Indeed',
            easyApply: false,
            salary,
            applied: false
          });
        } catch (err) {
          continue;
        }
      }

      console.log(`🔍 Indeed: Found ${jobs.length} jobs for "${keyword}"`);
      return jobs;
    } catch (error) {
      console.error('❌ Indeed scraping error:', error.message);
      return [];
    }
  }

  filterJobs(jobs) {
    return jobs.filter(job => {
      const text = `${job.title} ${job.company}`.toLowerCase();

      // Check if it matches must-have skills
      const hasRequiredSkill = keywords.mustHaveSkills.some(skill => 
        text.includes(skill.toLowerCase())
      );

      // Check if it's not in exclude list
      const isExcluded = keywords.excludeKeywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );

      return hasRequiredSkill && !isExcluded;
    });
  }

  async searchAllJobs() {
    await this.initialize();

    const allJobs = [];

    for (const keyword of keywords.jobKeywords.slice(0, 3)) {
      // LinkedIn
      const linkedInJobs = await this.scrapeLinkedInJobs(keyword, 'remote');
      allJobs.push(...linkedInJobs);

      await new Promise(resolve => setTimeout(resolve, 3000)); // Rate limiting

      // Indeed
      const indeedJobs = await this.scrapeIndeedJobs(keyword, 'remote');
      allJobs.push(...indeedJobs);

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await this.close();

    // Filter and remove duplicates
    const filtered = this.filterJobs(allJobs);
    const unique = this.removeDuplicates(filtered);

    console.log(`✅ Total unique jobs found: ${unique.length}`);
    return unique;
  }

  removeDuplicates(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      const key = `${job.company}-${job.title}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

module.exports = new JobScraper();