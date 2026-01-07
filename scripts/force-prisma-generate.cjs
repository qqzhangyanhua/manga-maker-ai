const { execSync } = require('child_process');

console.log('🔄 Regenerating Prisma Client...\n');

try {
  // Generate Prisma Client directly
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: require('path').join(__dirname, '..')
  });

  console.log('\n✅ Prisma Client generated successfully!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Failed to generate Prisma Client:', error.message);
  console.error('\n💡 Tip: If you see EPERM error, please:');
  console.error('   1. Close any running dev servers (pnpm dev)');
  console.error('   2. Wait a few seconds');
  console.error('   3. Run this script again\n');
  process.exit(1);
}
