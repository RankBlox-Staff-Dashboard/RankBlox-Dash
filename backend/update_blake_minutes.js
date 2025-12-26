const mysql = require('mysql2/promise');

async function updateMinutes() {
  const conn = await mysql.createConnection({
    host: 'ahsDB.zenohost.co.uk',
    user: 'AHSStaff',
    password: 'AHSStaff2025!Security!Zenohost',
    database: 'ahstaffsecureencrypteddatabase'
  });

  try {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().split('T')[0];
    
    const newMinutes = 35; // Simulating 35 minutes from Roblox
    
    const [existing] = await conn.query(
      'SELECT minutes FROM activity_logs WHERE user_id = 1 AND week_start = ?',
      [weekStart]
    );
    
    const currentMinutes = existing.length > 0 ? parseInt(existing[0].minutes) || 0 : 0;
    const finalMinutes = Math.max(currentMinutes, newMinutes);
    
    if (existing.length > 0) {
      await conn.query(
        'UPDATE activity_logs SET minutes = ? WHERE user_id = 1 AND week_start = ?',
        [finalMinutes, weekStart]
      );
      console.log('✅ Updated minutes:', currentMinutes, '->', finalMinutes);
    } else {
      await conn.query(
        'INSERT INTO activity_logs (user_id, week_start, minutes) VALUES (1, ?, ?)',
        [weekStart, newMinutes]
      );
      console.log('✅ Created new activity log with', newMinutes, 'minutes');
    }
    
    const [updated] = await conn.query(
      'SELECT u.roblox_username, al.minutes, al.week_start FROM activity_logs al JOIN users u ON al.user_id = u.id WHERE u.id = 1 AND al.week_start = ?',
      [weekStart]
    );
    
    console.log('\n📊 Updated Data:');
    console.log('   Username:', updated[0].roblox_username);
    console.log('   Minutes:', updated[0].minutes);
    console.log('   Week:', updated[0].week_start.toISOString().split('T')[0]);
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
    await conn.end();
    process.exit(1);
  }
}

updateMinutes();



