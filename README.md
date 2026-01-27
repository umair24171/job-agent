# 🤖 Job Application Agent

Automated 24/7 job search and application bot that:
- 🔍 Searches LinkedIn & Indeed for jobs
- ✅ Auto-applies to Easy Apply jobs
- 📧 Monitors Gmail for important emails
- 📊 Logs everything to Google Sheets
- 📱 Sends WhatsApp notifications

## 🚀 Setup Guide

### Step 1: Clone and Install

```bash
git clone <your-repo>
cd job-agent
npm install
```

### Step 2: Create Twilio Account & Setup WhatsApp

**See detailed guide:** [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md)

Quick steps:
1. Sign up at https://www.twilio.com/try-twilio
2. Go to WhatsApp Sandbox
3. Send join message to +14155238886 on WhatsApp
4. Get your Account SID and Auth Token
5. Test with: `node setup/test-whatsapp.js`

### Step 3: Setup Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials (Desktop app)
5. Download credentials JSON
6. Run this script to get refresh token:

```javascript
// get-gmail-token.js
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/oauth2callback'
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error:', err);
    console.log('Your refresh token:', token.refresh_token);
  });
});
```

Run: `node get-gmail-token.js`

### Step 4: Setup Google Sheets

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Sheets API**
3. Create **Service Account**
4. Download JSON key file
5. Create a new Google Sheet
6. Share it with the service account email (from JSON)
7. Copy the Sheet ID from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

### Step 5: Setup GitHub Secrets

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add these secrets:

```
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
GMAIL_REFRESH_TOKEN=your_refresh_token

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+923001234567

GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key_from_json

LINKEDIN_EMAIL=your_linkedin_email
LINKEDIN_PASSWORD=your_linkedin_password

INDEED_EMAIL=your_email
INDEED_PASSWORD=your_password

JOB_KEYWORDS=flutter,react,nodejs
JOB_LOCATIONS=remote,pakistan
EXPERIENCE_LEVEL=mid-senior
```

### Step 6: Test Locally

```bash
# Create .env file (copy from .env.example)
cp .env.example .env

# Add your credentials to .env
nano .env

# Test run
npm start
```

### Step 7: Deploy to GitHub Actions

1. Push code to GitHub
2. Go to Actions tab
3. Enable workflows
4. Click "Run workflow" to test
5. Agent will now run automatically every 2 hours!

## 📊 How It Works

### Every 2 Hours:
1. ✅ Checks Gmail for unread emails
2. ✅ Filters important ones (interviews, offers, etc.)
3. ✅ Sends WhatsApp notification for important emails
4. ✅ Searches LinkedIn & Indeed for jobs
5. ✅ Filters jobs based on your criteria
6. ✅ Auto-applies to LinkedIn Easy Apply jobs
7. ✅ Logs everything to Google Sheets
8. ✅ Sends job notifications to Telegram

### What Gets Logged:
- Date found
- Company name
- Job title
- Location
- Salary (if available)
- Job link
- Applied status
- Source (LinkedIn/Indeed)

## ⚙️ Configuration

Edit `config/keywords.json` to customize:
- Job keywords to search
- Required skills
- Locations
- Email importance keywords
- Excluded job types

## 🔧 Troubleshooting

**LinkedIn login fails:**
- Check credentials
- LinkedIn might have CAPTCHA (use 2captcha.com)
- Try running locally first

**Gmail API errors:**
- Check if API is enabled
- Verify refresh token is valid
- Check quota limits

**No jobs found:**
- Check keywords are not too specific
- Try broader search terms
- Check if LinkedIn/Indeed changed HTML structure

**GitHub Actions fails:**
- Check all secrets are set correctly
- Look at workflow logs for specific errors
- Try running locally first to debug

## 📱 Notifications

You'll get WhatsApp messages for:
- 🎯 New jobs found
- ✅ Successfully applied jobs
- ⏳ Jobs that need manual application
- 📧 Important emails
- 📊 Daily summary

## 🛡️ Privacy & Security

- All credentials stored in GitHub Secrets (encrypted)
- Never commit `.env` file
- Bot only reads/sends to your email
- No data shared with third parties

## 📈 Future Improvements

- [ ] Add Indeed auto-apply
- [ ] Support more job boards
- [ ] AI-powered cover letter generation
- [ ] Interview scheduling automation
- [ ] Application tracking dashboard

## 🤝 Contributing

Feel free to submit issues or PRs!

## 📝 License

MIT

---

**Built by Umair** 🚀
For questions: Create an issue on GitHub