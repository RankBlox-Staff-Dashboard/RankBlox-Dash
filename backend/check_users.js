const mysql = require('mysql2/promise');

async function checkUsers() {
  const dbConfig = {
    host: 'ahsDB.zenohost.co.uk',
    user: 'AHSStaff',
    password: 'AHSStaff2025!Security!Zenohost',
    database: 'ahstaffsecureencrypteddatabase',
  };

  try {
    console.log('Connecting to MySQL database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!\n');

    // Check by Roblox username
    console.log('='.repeat(80));
    console.log('USER 1: Checking by Roblox Username "BlakeGamez0"');
    console.log('='.repeat(80));
    
    const [user1] = await connection.query(
      `SELECT id, discord_id, discord_username, roblox_id, roblox_username, \`rank\`, rank_name, status, created_at 
       FROM users 
       WHERE roblox_username = ? OR LOWER(roblox_username) = LOWER(?)`,
      ['BlakeGamez0', 'BlakeGamez0']
    );

    if (user1.length > 0) {
      const user = user1[0];
      console.log('\n📋 USER DATA:');
      console.table([user]);
      
      // Get activity logs
      console.log('\n📊 ACTIVITY LOGS:');
      const [logs1] = await connection.query(
        `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY week_start DESC LIMIT 10`,
        [user.id]
      );
      
      if (logs1.length > 0) {
        console.table(logs1);
      } else {
        console.log('  No activity logs found.');
      }
    } else {
      console.log('  ❌ User not found with Roblox username: BlakeGamez0');
    }

    // Check by Discord ID
    console.log('\n\n' + '='.repeat(80));
    console.log('USER 2: Checking by Discord ID "1195782745582993428"');
    console.log('='.repeat(80));
    
    const [user2] = await connection.query(
      `SELECT id, discord_id, discord_username, roblox_id, roblox_username, \`rank\`, rank_name, status, created_at 
       FROM users 
       WHERE discord_id = ?`,
      ['1195782745582993428']
    );

    if (user2.length > 0) {
      const user = user2[0];
      console.log('\n📋 USER DATA:');
      console.table([user]);
      
      // Get activity logs
      console.log('\n📊 ACTIVITY LOGS:');
      const [logs2] = await connection.query(
        `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY week_start DESC LIMIT 10`,
        [user.id]
      );
      
      if (logs2.length > 0) {
        console.table(logs2);
      } else {
        console.log('  No activity logs found.');
      }
    } else {
      console.log('  ❌ User not found with Discord ID: 1195782745582993428');
    }

    // Check if they're the same user
    if (user1.length > 0 && user2.length > 0) {
      if (user1[0].id === user2[0].id) {
        console.log('\n\n✅ Both queries returned the SAME user!');
        console.log(`   User ID: ${user1[0].id}`);
        console.log(`   Discord: ${user1[0].discord_username} (${user1[0].discord_id})`);
        console.log(`   Roblox: ${user1[0].roblox_username} (${user1[0].roblox_id})`);
      } else {
        console.log('\n\n⚠️  These are DIFFERENT users!');
      }
    }

    // Get current week's minutes
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().split('T')[0];
    
    console.log('\n\n' + '='.repeat(80));
    console.log(`CURRENT WEEK (${weekStart}) MINUTES:`);
    console.log('='.repeat(80));
    
    const [currentWeek] = await connection.query(
      `SELECT u.roblox_username, u.discord_username, al.minutes, al.week_start, al.messages_sent, al.tickets_claimed, al.tickets_resolved
       FROM activity_logs al
       JOIN users u ON al.user_id = u.id
       WHERE (u.roblox_username = ? OR u.discord_id = ?) AND al.week_start = ?`,
      ['BlakeGamez0', '1195782745582993428', weekStart]
    );
    
    if (currentWeek.length > 0) {
      console.table(currentWeek);
    } else {
      console.log('  No activity log for current week.');
    }

    await connection.end();
    console.log('\n✅ Query completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();

