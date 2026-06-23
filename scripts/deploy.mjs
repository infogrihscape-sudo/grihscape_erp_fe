import { execSync } from 'child_process';

// ── Deploy config ─────────────────────────────────────────────────────────────
const S3_BUCKET  = 'grihscape-frontend';
const CF_DIST_ID = 'E1N5W6BEZ9G8BY';
// ─────────────────────────────────────────────────────────────────────────────

function run(label, cmd) {
  console.log(`\n[${label}] ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('=== Grihascape FE Deploy ===\n');

run('1/3 BUILD', 'npm run build');
run('2/3 S3 SYNC', `aws s3 sync dist/ s3://${S3_BUCKET}`);
try {
  run('3/3 CF INVALIDATE', `aws cloudfront create-invalidation --distribution-id ${CF_DIST_ID} --paths "/*"`);
} catch {
  console.warn('\n[3/3 CF INVALIDATE] Warning: cache invalidation failed — files are live on S3 but CDN cache may take up to 24h to refresh. Fix CloudFront permissions to invalidate instantly.');
}

console.log('\n=== Deploy complete — live in ~1 min ===');
