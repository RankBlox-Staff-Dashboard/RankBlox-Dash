// Browser Console Test Script
// Copy and paste this into your browser console on the frontend site

(async function testActivityAPI() {
  const userId = 2682565491;
  const token = 'f4ce0b59a2b93faa733f9774e3a57f376d4108edca9252b2050661d8b36b50c5f16bd0ba45a9f22c8493a7a8a9d86f90';
  
  console.log('%c🧪 Testing EasyPOS Activity API...', 'color: blue; font-weight: bold;');
  console.log('UserId:', userId);
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('URL: https://papi.easypos.lol/activity/data');
  console.log('');
  
  try {
    console.log('📤 Making POST request...');
    const response = await fetch('https://papi.easypos.lol/activity/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        userId: userId
      })
    });
    
    console.log('📥 Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('✅ SUCCESS!');
    console.log('Response Data:', data);
    
    // Try to extract minutes
    let minutes = null;
    if (data && typeof data.minutes === 'number') {
      minutes = data.minutes;
    } else if (data && typeof data.activityMinutes === 'number') {
      minutes = data.activityMinutes;
    } else if (data && typeof data.playtime === 'number') {
      minutes = data.playtime;
    } else if (typeof data === 'number') {
      minutes = data;
    }
    
    if (minutes !== null) {
      console.log('');
      console.log('%c📊 Extracted Minutes: ' + minutes, 'color: green; font-weight: bold; font-size: 16px;');
    } else {
      console.log('');
      console.log('%c⚠️ Could not extract minutes from response', 'color: orange; font-weight: bold;');
      console.log('Response structure:', typeof data);
      if (data && typeof data === 'object') {
        console.log('Response keys:', Object.keys(data));
      }
    }
    
    return { success: true, data, minutes };
    
  } catch (error) {
    console.error('%c❌ ERROR!', 'color: red; font-weight: bold;');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    return { success: false, error };
  }
})();

