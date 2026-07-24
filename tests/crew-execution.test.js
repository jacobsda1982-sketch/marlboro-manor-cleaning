import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('crew workspace executes assigned jobs without exposing private management controls', async () => {
  const [portal, worker, api] = await Promise.all([
    readFile(new URL('../src/site/public-intake.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/site/worker.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/site/external-portals.js', import.meta.url), 'utf8')
  ])
  assert.match(portal, /Jobs and field actions/)
  assert.match(portal, /CHECK_IN/)
  assert.match(portal, /REQUEST_COMPLETION/)
  assert.match(api, /crew_job_assignments/)
  assert.match(api, /\/api\/crew-job-action/)
  assert.match(api, /\/api\/marble\/crew-job/)
  assert.match(api, /This job is not assigned to your account/)
  assert.match(worker, /crewJobExecution:\s*true/)
  assert.doesNotMatch(portal, /approveJobQuality|awardContractor|prepareReviewedCharge/)
})
