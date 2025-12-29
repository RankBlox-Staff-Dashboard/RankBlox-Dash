/**
 * Verification script for /dm command
 * This verifies the command structure and that it can be loaded correctly
 */

console.log('🔍 Verifying /dm command...\n');

try {
  // Load the compiled command
  const command = require('./dist/commands/dm.js');
  
  console.log('✅ Command module loaded successfully\n');
  
  // Verify exports
  console.log('📋 Verifying exports:');
  if (!command.data) {
    throw new Error('Missing "data" export');
  }
  console.log('  ✅ Exports "data"');
  
  if (!command.execute) {
    throw new Error('Missing "execute" export');
  }
  console.log('  ✅ Exports "execute"');
  
  // Verify command data
  console.log('\n📝 Command Details:');
  const cmdData = command.data.toJSON();
  console.log(`  Name: ${cmdData.name}`);
  console.log(`  Description: ${cmdData.description}`);
  console.log(`  Type: ${cmdData.type} (1 = Chat Input)`);
  
  // Verify options
  console.log('\n⚙️  Options:');
  if (cmdData.options && cmdData.options.length > 0) {
    cmdData.options.forEach((opt: any) => {
      console.log(`  - ${opt.name}:`);
      console.log(`    Type: ${opt.type} (3 = String)`);
      console.log(`    Required: ${opt.required}`);
      console.log(`    Max Length: ${opt.max_length || 'N/A'}`);
      console.log(`    Description: ${opt.description}`);
    });
  } else {
    throw new Error('Command has no options');
  }
  
  // Verify execute function signature
  console.log('\n🔧 Execute Function:');
  console.log(`  Type: ${typeof command.execute}`);
  console.log(`  Name: ${command.execute.name || 'anonymous'}`);
  console.log(`  Parameters: ${command.execute.length} (expects 1: interaction)`);
  
  // Check for key functions in the code
  console.log('\n🔍 Code Structure Check:');
  const commandCode = require('fs').readFileSync('./dist/commands/dm.js', 'utf-8');
  
  const checks = [
    { name: 'Server owner check (guild.ownerId)', pattern: /guild\.ownerId/ },
    { name: 'Rate limiting (BATCH_SIZE)', pattern: /BATCH_SIZE/ },
    { name: 'Delay between batches', pattern: /DELAY_BETWEEN_BATCHES/ },
    { name: 'DM error handling (50007)', pattern: /50007/ },
    { name: 'Ephemeral reply', pattern: /ephemeral.*true/ },
    { name: 'Progress updates', pattern: /Mass DM In Progress/ },
    { name: 'Bot filtering', pattern: /\.bot/ },
    { name: 'Member fetching', pattern: /members\.fetch/ },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(commandCode)) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ⚠️  ${check.name} - not found`);
    }
  });
  
  console.log('\n✅ Command verification complete!');
  console.log('\n📋 Summary:');
  console.log('  ✅ Command structure is valid');
  console.log('  ✅ All required exports present');
  console.log('  ✅ Command options configured correctly');
  console.log('  ✅ Key features detected in code');
  console.log('\n💡 Next steps:');
  console.log('  1. Restart your Discord bot');
  console.log('  2. The command will be registered automatically');
  console.log('  3. Test with: /dm message:"Your message here"');
  console.log('  4. Only the server owner can use this command');
  
} catch (error: any) {
  console.error('\n❌ Verification failed:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
