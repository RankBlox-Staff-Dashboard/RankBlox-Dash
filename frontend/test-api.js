// Test script for EasyPOS Activity API
// Run this in browser console or Node.js

const axios = require('axios');

async function testActivityAPI() {
  const userId = 2682565491;
  const token = 'f4ce0b59a2b93faa733f9774e3a57f376d4108edca9252b2050661d8b36b50c5f16bd0ba45a9f22c8493a7a8a9d86f90';
  
  console.log('Testing EasyPOS Activity API...');
  console.log('UserId:', userId);
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('URL: https://papi.easypos.lol/activity/data');
  console.log('');
  
  try {
    console.log('Making POST request...');
    const req = await axios.post('https://papi.easypos.lol/activity/data', {
      token: token,
      userId: userId
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS!');
    console.log('Response Status:', req.status);
    console.log('Response Data:', JSON.stringify(req.data, null, 2));
    
    const response = req.data;
    
    // Try to extract minutes
    let minutes = null;
    if (response && typeof response.minutes === 'number') {
      minutes = response.minutes;
    } else if (response && typeof response.activityMinutes === 'number') {
      minutes = response.activityMinutes;
    } else if (response && typeof response.playtime === 'number') {
      minutes = response.playtime;
    } else if (typeof response === 'number') {
      minutes = response;
    }
    
    if (minutes !== null) {
      console.log('');
      console.log('📊 Extracted Minutes:', minutes);
    } else {
      console.log('');
      console.log('⚠️ Could not extract minutes from response');
      console.log('Response structure:', typeof response);
      if (response && typeof response === 'object') {
        console.log('Response keys:', Object.keys(response));
      }
    }
    
  } catch (error) {
    console.error('❌ ERROR!');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received');
      console.error('Request:', error.request);
    }
    console.error('Full error:', error);
  }
}

// Run the test
testActivityAPI();

