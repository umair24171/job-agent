#!/usr/bin/env node

/**
 * Gmail OAuth Token Generator
 * Run this to get your Gmail refresh token
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const PORT = 3000;

// Get from command line arguments
const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('\n❌ Missing credentials!\n');
  console.log('Usage: node get-gmail-token.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET\n');
  console.log('Get these from your Google Cloud Console OAuth credentials JSON\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly'
];

function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent screen to get refresh token
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = url.parse(req.url, true);
        
        if (parsedUrl.pathname === '/oauth2callback') {
          const code = parsedUrl.query.code;
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  }
                  .container {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    text-align: center;
                  }
                  h1 { color: #667eea; margin: 0 0 20px 0; }
                  p { color: #666; font-size: 18px; }
                  .emoji { font-size: 64px; margin-bottom: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="emoji">✅</div>
                  <h1>Authorization Successful!</h1>
                  <p>You can close this window and return to your terminal.</p>
                </div>
              </body>
            </html>
          `);

          server.close();

          try {
            const { tokens } = await oauth2Client.getToken(code);
            resolve(tokens);
          } catch (error) {
            reject(error);
          }
        }
      } catch (error) {
        reject(error);
      }
    });

    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use. Close other applications and try again.\n`);
      }
      reject(error);
    });
  });
}

async function main() {
  console.log('\n📧 Gmail OAuth Token Generator\n');
  console.log('Client ID:', CLIENT_ID.substring(0, 20) + '...');
  console.log('');

  const authUrl = getAuthUrl();

  console.log('1️⃣  Opening browser for authorization...\n');
  console.log('If browser doesn\'t open, visit this URL:\n');
  console.log(authUrl);
  console.log('\n2️⃣  After authorization, you will be redirected...\n');

  // Try to open browser
  try {
    const open = (await import('open')).default;
    await open(authUrl);
  } catch (error) {
    console.log('⚠️  Could not open browser automatically. Please copy the URL above.\n');
  }

  try {
    const tokens = await startServer();

    console.log('\n✅ SUCCESS! Here are your tokens:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Copy this to your .env file!\n');

  } catch (error) {
    console.error('\n❌ Error getting tokens:', error.message);
    process.exit(1);
  }
}

main();