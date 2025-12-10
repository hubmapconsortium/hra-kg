#!/usr/bin/env node
import { DistributedJobRunner } from './distributed-job-runner.js';

const HOSTS = process.env.HOSTS?.split(/\s+/) || [];
const MAX_PROCESSES = parseInt(process.env.MAX_PROCESSES || '1', 10);
const JOB_FILE = process.argv[2] || process.stdin;

if (HOSTS.length === 0 || isNaN(MAX_PROCESSES)) {
  console.error('Usage: HOSTS="host1 host2" MAX_PROCESSES=N node cli.js [jobs.txt]');
  process.exit(1);
}

const runner = new DistributedJobRunner({
  hosts: HOSTS,
  maxProcesses: MAX_PROCESSES,
  continueOnError: true
});

(async () => {
  await runner.start();
  console.error(`Streaming jobs from: ${JOB_FILE == process.stdin ? 'stdin' : JOB_FILE}`);
  await runner.streamJobs(JOB_FILE);
  await runner.waitForEmptyQueue();
  await runner.shutdown();
})();
