/**
 * Debug script to test authentication flow
 * Run with: node debug-auth.js
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'https://rankblox-dash-backend-706270663868.europe-west1.run.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://rank-blox-dash.vercel.app';

console.log('🔍 Authentication Debug Test');
console.log('================================');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log('');

async function testHealthCheck() {
  console.log('1️⃣  Testing Backend Health Check...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    console.log('   ✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('   ❌ Health check failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return false;
  }
}

async function testOAuthInit() {
  console.log('\n2️⃣  Testing OAuth Initiation...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/auth/discord`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status === 301,
    });
    
    const location = response.headers.location;
    console.log('   ✅ OAuth redirect URL:', location);
    
    if (location && location.includes('discord.com')) {
      console.log('   ✅ Redirects to Discord');
      
      // Parse the redirect URL
      const url = new URL(location);
      const state = url.searchParams.get('state');
      const clientId = url.searchParams.get('client_id');
      const redirectUri = url.searchParams.get('redirect_uri');
      
      console.log('   📋 OAuth Parameters:');
      console.log('      State:', state ? '✅ Present' : '❌ Missing');
      console.log('      Client ID:', clientId ? '✅ Present' : '❌ Missing');
      console.log('      Redirect URI:', redirectUri || '❌ Missing');
      
      // Check cookies
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        console.log('   🍪 Cookies set:');
        cookies.forEach(cookie => {
          if (cookie.includes('oauth_state')) {
            console.log('      ✅ oauth_state cookie found');
            console.log('      Cookie details:', cookie.split(';')[0]);
          }
        });
      } else {
        console.log('   ⚠️  No cookies set in response');
      }
      
      return { success: true, state, location };
    } else {
      console.log('   ❌ Does not redirect to Discord');
      return { success: false };
    }
  } catch (error) {
    if (error.response && (error.response.status === 302 || error.response.status === 301)) {
      // This is actually a redirect, which is expected
      return testOAuthInit();
    }
    console.error('   ❌ OAuth initiation failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return { success: false };
  }
}

async function testAuthMe() {
  console.log('\n3️⃣  Testing /api/auth/me (should fail without token)...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/auth/me`);
    console.log('   ⚠️  Unexpected success (should require auth):', response.data);
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('   ✅ Correctly requires authentication (401)');
      return true;
    } else {
      console.error('   ❌ Unexpected error:', error.message);
      return false;
    }
  }
}

async function testCORS() {
  console.log('\n4️⃣  Testing CORS Configuration...');
  try {
    const response = await axios.options(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
    };
    
    console.log('   📋 CORS Headers:', corsHeaders);
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log('   ✅ CORS is configured');
      if (corsHeaders['access-control-allow-credentials'] === 'true') {
        console.log('   ✅ Credentials allowed');
      } else {
        console.log('   ⚠️  Credentials not explicitly allowed');
      }
    } else {
      console.log('   ⚠️  No CORS origin header');
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ CORS test failed:', error.message);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('\n5️⃣  Checking Environment Variables...');
  const required = [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_REDIRECT_URI',
    'JWT_SECRET',
  ];
  
  const missing = [];
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
      console.log(`   ❌ ${key}: NOT SET`);
    } else {
      // Don't log the actual values for security
      const value = process.env[key];
      const display = key.includes('SECRET') ? '***' : value;
      console.log(`   ✅ ${key}: ${display}`);
    }
  });
  
  if (missing.length > 0) {
    console.log(`\n   ⚠️  Missing environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  // Check redirect URI format
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (redirectUri) {
    try {
      const url = new URL(redirectUri);
      if (url.pathname.includes('/api/auth/discord/callback')) {
        console.log('   ✅ Redirect URI format looks correct');
      } else {
        console.log('   ⚠️  Redirect URI path might be incorrect:', url.pathname);
      }
    } catch (e) {
      console.log('   ❌ Redirect URI is not a valid URL');
    }
  }
  
  return true;
}

async function runTests() {
  console.log('Starting authentication debug tests...\n');
  
  const results = {
    health: await testHealthCheck(),
    oauth: await testOAuthInit(),
    authMe: await testAuthMe(),
    cors: await testCORS(),
    env: checkEnvironmentVariables(),
  };
  
  console.log('\n================================');
  console.log('📊 Test Results Summary:');
  console.log('================================');
  console.log(`Health Check: ${results.health ? '✅' : '❌'}`);
  console.log(`OAuth Init: ${results.oauth.success ? '✅' : '❌'}`);
  console.log(`Auth /me: ${results.authMe ? '✅' : '❌'}`);
  console.log(`CORS: ${results.cors ? '✅' : '❌'}`);
  console.log(`Environment: ${results.env ? '✅' : '❌'}`);
  
  console.log('\n💡 Common Issues:');
  console.log('   1. If OAuth cookie is missing: Check cookie settings (SameSite, Secure, Domain)');
  console.log('   2. If CORS fails: Check backend CORS configuration');
  console.log('   3. If redirect URI fails: Ensure it matches Discord app settings exactly');
  console.log('   4. If state validation fails: Cookie might not be preserved during redirect');
}

// Run tests
runTests().catch(console.error);

