const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function createFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${filePath} already exists, skipping`);
    return;
  }
  fs.writeFileSync(filePath, content);
  console.log(`  ✓ Created ${filePath}`);
}

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'packages', 'backend');
const botDir = path.join(rootDir, 'packages', 'bot');
const dashboardDir = path.join(rootDir, 'packages', 'dashboard');

const apiKey = generateSecret();
const jwtSecret = generateSecret();

console.log('\n🛡️  Setting up Discord Threat Detector...\n');

// Root .env
createFile(path.join(rootDir, '.env'), `# Backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/threat_detector?schema=public"
PORT=3001
JWT_SECRET=${jwtSecret}
API_KEY=${apiKey}
OPENAI_API_KEY=sk-your-openai-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

# Bot
DISCORD_BOT_TOKEN=your-discord-bot-token
BACKEND_URL=http://localhost:3001
BOT_API_KEY=${apiKey}
DISCORD_CLIENT_ID=your-client-id

# Dashboard
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
`);

// Backend .env
createFile(path.join(backendDir, '.env'), `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/threat_detector?schema=public"
PORT=3001
JWT_SECRET=${jwtSecret}
API_KEY=${apiKey}
OPENAI_API_KEY=sk-your-openai-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
`);

// Bot .env
createFile(path.join(botDir, '.env'), `DISCORD_BOT_TOKEN=your-discord-bot-token
BACKEND_URL=http://localhost:3001
BOT_API_KEY=${apiKey}
DISCORD_CLIENT_ID=your-client-id
`);

// Dashboard .env.local
createFile(path.join(dashboardDir, '.env.local'), `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
`);

// .gitignore
createFile(path.join(rootDir, '.gitignore'), `node_modules/
.env
.env.local
.env.*.local
dist/
.next/
*.db
*.db-journal
coverage/
`);

console.log('\n✅ Environment setup complete!\n');
console.log('📋 Next steps:');
console.log('  1. Edit packages/backend/.env with your OPENAI_API_KEY');
console.log('  2. Edit packages/bot/.env with your DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID');
console.log('  3. Start PostgreSQL (Docker or external)');
console.log('  4. Run: npm run db:push');
console.log('  5. Run: npm run dev\n');
