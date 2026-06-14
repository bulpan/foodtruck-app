const fs = require('fs');
const path = require('path');
const {
  CACHE_FILE,
  LOG_DIR,
  flushVisitorStatsCache,
  ingestLogFile,
  resetVisitorStatsStore
} = require('../services/visitorStatsService');

async function main() {
  resetVisitorStatsStore();

  if (!fs.existsSync(LOG_DIR)) {
    console.log(`Log directory does not exist: ${LOG_DIR}`);
    await flushVisitorStatsCache({ force: true });
    return;
  }

  const logFiles = fs.readdirSync(LOG_DIR)
    .filter((name) => name.startsWith('server-') && name.endsWith('.log'))
    .sort();

  let totalParsed = 0;
  let totalRecorded = 0;

  for (const fileName of logFiles) {
    const fullPath = path.join(LOG_DIR, fileName);
    const stats = fs.statSync(fullPath);
    console.log(`Parsing ${fileName} (${stats.size} bytes)`);

    const result = await ingestLogFile(fullPath);
    totalParsed += result.parsedCount;
    totalRecorded += result.recordedCount;

    console.log(`  parsed=${result.parsedCount} recorded=${result.recordedCount}`);
  }

  await flushVisitorStatsCache({ force: true });

  console.log(`Visitor stats cache rebuilt: ${CACHE_FILE}`);
  console.log(`Total parsed=${totalParsed} recorded=${totalRecorded}`);
}

main().catch((error) => {
  console.error('Failed to rebuild visitor stats cache:', error);
  process.exitCode = 1;
});
