import { execSync } from 'child_process';

// ── Deploy config — update CF_DIST_ID once ───────────────────────────────────
const S3_BUCKET  = 'grihscape-frontend';
const CF_DIST_ID = 'YOUR_CLOUDFRONT_DISTRIBUTION_ID'; // e.g. E1A2B3C4D5E6F7
// ─────────────────────────────────────────────────────────────────────────────

if (CF_DIST_ID === 'YOUR_CLOUDFRONT_DISTRIBUTION_ID') {
  console.error('ERROR: Set CF_DIST_ID in scripts/deploy.mjs before deploying.');
  process.exit(1);
}

function run(label, cmd) {
  console.log(`\n[${label}] ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('=== Grihascape FE Deploy ===\n');

run('1/3 BUILD', 'npm run build');
run('2/3 S3 SYNC', `aws s3 sync dist/ s3://${S3_BUCKET} --delete`);
run('3/3 CF INVALIDATE', `aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths "/*"`);

console.log('\n=== Deploy complete — live in ~1 min ===');
