import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

// Promisified exec for async/await support
const execAsync = promisify(exec);

// Read SSH hosts from the HOSTS environment variable, separated by spaces
const HOSTS = process.env.HOSTS?.split(/\s+/) || [];

// Maximum number of parallel jobs to run per host
const MAX_PROCESSES = parseInt(process.env.MAX_PROCESSES || '1', 10);

// The file containing one bash command per line
const JOB_FILE = process.argv[2];

// Validate input
if (!JOB_FILE || HOSTS.length === 0 || isNaN(MAX_PROCESSES)) {
  console.error('Usage: HOSTS="host1 host2" MAX_PROCESSES=N node script.js jobs.txt');
  process.exit(1);
}

// Read all job lines from the file
const jobQueue = fs
  .readFileSync(JOB_FILE, 'utf-8')
  .split('\n')
  .filter((line) => line.trim());
const totalJobs = jobQueue.length;
let completedJobs = 0;

// Create queues for each host with their own job lists
const hostQueues = HOSTS.map((host) => ({ host, running: 0, queue: [] }));

// Distribute jobs round-robin across hosts
for (let i = 0; i < jobQueue.length; i++) {
  hostQueues[i % HOSTS.length].queue.push(jobQueue[i]);
}

function prefixMultilineString(prefix, string) {
  return string
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

/**
 * Executes a given command on a remote host over SSH in the current working directory.
 * @param {string} host - The SSH host to run the command on.
 * @param {string} command - The bash command to execute.
 * @returns {Promise<void>} - A promise that resolves when the command has completed.
 */
async function runJob(host, command) {
  const pwd = process.cwd();
  // Ensure we cd into the current working directory before running the command remotely
  const wrappedCommand = `ssh ${host} 'cd ${pwd} && ${command.replace(/'/g, "'\\''")}'`;
  try {
    const { stdout, stderr } = await execAsync(wrappedCommand);
    if (stdout) process.stdout.write(prefixMultilineString(`[${host}]`, stdout));
    if (stderr.trim()) process.stderr.write(prefixMultilineString(`[${host} STDERR] `, stderr));
  } catch (err) {
    console.error(`[${host} FAILED]`, err.message);
  } finally {
    completedJobs++;
    process.stdout.write(
      `Progress: ${completedJobs} / ${totalJobs} jobs completed at ${new Date().toLocaleString()}\n`
    );
  }
}

/**
 * Processes a queue of jobs for a specific host with concurrency control.
 * @param {{host: string, running: number, queue: string[]}} hostQueue - The queue object for a specific host.
 * @returns {Promise<void>} - A promise that resolves when all jobs for the host are completed.
 */
async function processHostQueue(hostQueue) {
  const promises = [];

  /**
   * Launches the next job if the number of currently running jobs is below the limit.
   * @returns {Promise<void>|void}
   */
  async function next() {
    if (hostQueue.queue.length === 0) return;
    if (hostQueue.running >= MAX_PROCESSES) return;

    const job = hostQueue.queue.shift();
    hostQueue.running++;
    const p = runJob(hostQueue.host, job).finally(() => {
      hostQueue.running--;
      next(); // Continue launching next job once this one completes
    });
    promises.push(p);
    next(); // Fire off more jobs if possible
  }

  // Initialize up to MAX_PROCESSES parallel jobs
  for (let i = 0; i < MAX_PROCESSES; i++) {
    next();
  }

  // Wait for all jobs on this host to finish
  await Promise.all(promises);
}

/**
 * Entry point for the script: starts processing all host queues in parallel.
 */
(async () => {
  await Promise.all(hostQueues.map(processHostQueue));
})();
