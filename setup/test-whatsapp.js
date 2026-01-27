#!/usr/bin/env node

/**
 * WhatsApp (Twilio) Tester
 * Run this to verify your Twilio WhatsApp is working
 */

const twilio = require('twilio');

const ACCOUNT_SID = process.argv[2];
const AUTH_TOKEN = process.argv[3];
const FROM_NUMBER = process.argv[4]; // whatsapp:+14155238886
const TO_NUMBER = process.argv[5];   // whatsapp:+923001234567

if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER || !TO_NUMBER) {
  console.log('Usage: node test-whatsapp.js ACCOUNT_SID AUTH_TOKEN FROM_NUMBER TO_NUMBER');
  console.log('\nExample:');
  console.log('node test-whatsapp.js ACxxxx your_auth_token whatsapp:+14155238886 whatsapp:+923001234567');
  console.log('\nGet credentials from: https://console.twilio.com/');
  process.exit(1);
}

async function testWhatsApp() {
  console.log('📱 Testing WhatsApp via Twilio...\n');

  try {
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

    // Send test message
    const message = await client.messages.create({
      from: FROM_NUMBER,
      to: TO_NUMBER,
      body: '🎉 Test message from Job Agent!\n\nYour WhatsApp integration is working perfectly!'
    });
    
    console.log('✅ Test message sent successfully!');
    console.log('Message SID:', message.sid);
    console.log('\nCheck your WhatsApp 📱\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 20003) {
      console.log('\n💡 Authentication failed. Check your Account SID and Auth Token');
    } else if (error.code === 21211) {
      console.log('\n💡 Invalid "To" number. Make sure you joined the Twilio Sandbox first:');
      console.log('   Send "join <sandbox-keyword>" to +14155238886 on WhatsApp');
    } else if (error.code === 21614) {
      console.log('\n💡 Invalid "From" number. Use the Twilio Sandbox number:');
      console.log('   whatsapp:+14155238886');
    }
    
    console.log('\n🔗 Setup guide: https://www.twilio.com/docs/whatsapp/sandbox');
    
    process.exit(1);
  }
}

testWhatsApp();