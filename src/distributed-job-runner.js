import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import readline from 'readline';
import { RuntimeEstimator } from './runtime-estimator.js';

/**
 * DistributedJobRunner
 * --------------------
 * A long-lived, concurrent SSH-based job runner for distributing workloads across multiple hosts.
 *
 * Features:
 *  - Streams jobs from files or stdin.
 *  - Supports programmatic job addition via `addJob()`.
 *  - Allows concurrent job execution per host (`maxProcesses`).
 *  - Provides runtime estimates via a sliding window estimator.
 *  - Graceful shutdown and SIGINT (Ctrl+C) handling.
 *  - Emits lifecycle events for external integrations (logging, metrics, etc.).
 *  - Optional `continueOnError` mode to prevent job failures from stopping execution.
 *
 * Example:
 * ```js
 * const runner = new DistributedJobRunner({
 *   hosts: ['h1','h2'],
 *   maxProcesses: 2,
 *   continueOnError: true
 * });
 * await runner.start();
 * runner.addJob('echo "Hello"');
 * await runner.streamJobs('jobs.txt');
 * await runner.shutdown();
 * ```
 */
export class DistributedJobRunner extends EventEmitter {
  /**
   * @param {Object} opts
   * @param {string[]} opts.hosts - List of SSH hosts.
   * @param {number} opts.maxProcesses - Max concurrent jobs per host.
   * @param {boolean} [opts.continueOnError=false] - If true, job failures will not throw or stop execution.
   * @param {number} [opts.estimationWindowSeconds=28800] - RuntimeEstimator window in seconds (default 8 hours).
   * @param {number} [opts.estimationPrecision=2] - Number of decimal places for runtime estimate.
   */
  constructor({
    hosts,
    maxProcesses,
    continueOnError = false,
    estimationWindowSeconds = 28800,
    estimationPrecision = 2,
  }) {
    super();

    if (!hosts?.length) throw new Error('hosts array is required');
    if (!maxProcesses || isNaN(maxProcesses)) throw new Error('maxProcesses must be a number');

    /** @type {string[]} */
    this.hosts = hosts;
    /** @type {number} */
    this.maxProcesses = maxProcesses;
    /** @type {boolean} */
    this.continueOnError = continueOnError;

    /** @private */
    this.sharedQueue = [];
    /** @private */
    this.waitingResolvers = new Set();
    /** @private */
    this.activeChildren = new Set();
    /** @private */
    this.jobPromises = new Set();

    /** @private */
    this.estimator = new RuntimeEstimator({
      windowSeconds: estimationWindowSeconds,
      minSamples: maxProcesses * (hosts.length + 1),
      precision: estimationPrecision,
    });

    /** @private */
    this.aborted = false;
    /** @private */
    this.shuttingDown = false;
    /** @private */
    this.started = false;

    process.on('SIGINT', () => this.abort());
  }

  /**
   * Starts the distributed runner and launches persistent host workers.
   * This method returns immediately; workers will remain active until `shutdown()` is called.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.started) return;
    this.started = true;
    this.estimator.start(0);
    this.emit('start', { hosts: this.hosts, maxProcesses: this.maxProcesses });
    console.error(`Starting distributed runner on ${this.hosts.length} hosts...`);
    this.hostTasks = this.hosts.map((h) => this.#processHost(h));
  }

  /**
   * Adds a single job command to the shared queue.
   * @param {string} command - The shell command to execute remotely.
   * @throws {Error} If the runner is shutting down or aborted.
   */
  addJob(command) {
    if (this.aborted || this.shuttingDown) {
      throw new Error('Cannot add jobs after shutdown or abort');
    }
    const job = command.trim();
    if (!job) return;
    this.estimator.totalJobs++;

    if (this.waitingResolvers.size > 0) {
      const [resolve] = this.waitingResolvers;
      this.waitingResolvers.delete(resolve);
      resolve(job);
    } else {
      this.sharedQueue.push(job);
    }
  }

  /**
   * Streams jobs from a file path or readable stream, adding them to the queue.
   * The returned Promise resolves once all streamed jobs are added.
   * @param {string|import('stream').Readable} input - Path to a file or readable stream.
   * @returns {Promise<void>}
   */
  async streamJobs(input) {
    const stream = typeof input === 'string' ? fs.createReadStream(input, { encoding: 'utf-8' }) : input;

    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    rl.on('line', (line) => {
      const job = line.trim();
      if (!job) return;
      this.addJob(job);
    });

    return new Promise((resolve, reject) => {
      rl.on('close', resolve);
      rl.on('error', reject);
    });
  }

  /**
   * Internal utility: wait for the next job or return `null` if shutting down.
   * @private
   * @returns {Promise<string|null>}
   */
  async #getNextJob() {
    if (this.aborted) return null;
    if (this.sharedQueue.length > 0) return this.sharedQueue.shift();
    if (this.shuttingDown) return null;
    return new Promise((resolve) => this.waitingResolvers.add(resolve));
  }

  /**
   * Internal: spawns a subprocess with tracking and Promise completion.
   * @private
   * @param {string} command
   * @param {string[]} args
   * @param {import('child_process').SpawnOptions} [options]
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   */
  spawnAsync(command, args = [], options = {}) {
    const child = spawn(command, args, { shell: true, ...options });
    const result = new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // If we continue on errors, resolve rather than reject the command
      reject = this.continueOnError ? resolve : reject;

      child.stdout?.on('data', (d) => (stdout += d.toString()));
      child.stderr?.on('data', (d) => (stderr += d.toString()));

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          const err = new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr}`);
          Object.assign(err, { code, stdout, stderr });
          reject(err);
        }
      });

      child.on('error', reject);
    });

    this.activeChildren.add(child);
    result.finally(() => this.activeChildren.delete(child));
    return result;
  }

  /**
   * Internal: run a job on a remote host via SSH.
   * @private
   * @param {string} host
   * @param {string} command
   * @returns {Promise<void>}
   */
  async #runJob(host, command) {
    const cwd = process.cwd();
    const remoteCmd = `'cd ${cwd} && ${command.replace(/'/g, "'\\''")}'`;

    try {
      const { stdout, stderr } = await this.spawnAsync('ssh', [host, remoteCmd]);
      if (stdout) process.stdout.write(`[${host}] ${stdout}`);
      if (stderr) process.stderr.write(`[${host} ERROR] ${stderr}`);
      this.emit('jobSuccess', { host, command, stdout, stderr });
    } catch (err) {
      console.error(`[${host} FAILED]`, err.message);
      this.emit('jobError', { host, command, error: err });

      // Skip rejection if continueOnError is true
      if (!this.continueOnError) throw err;
    } finally {
      this.estimator.markJobComplete();
      console.log(this.estimator.getPrettyEstimate());
    }
  }

  /**
   * Internal: per-host worker loop.
   * @private
   * @param {string} host
   * @returns {Promise<void>}
   */
  async #processHost(host) {
    const active = new Set();

    const maybeStartNext = async () => {
      if (this.aborted) return;
      if (active.size >= this.maxProcesses) return;

      const job = await this.#getNextJob();
      if (!job) {
        if (this.shuttingDown && active.size === 0) return;
        await new Promise((r) => setTimeout(r, 100));
        return maybeStartNext();
      }

      const p = this.#runJob(host, job)
        .catch((err) => {
          if (!this.continueOnError) throw err; // still bubble up if configured to stop
        })
        .finally(() => {
          active.delete(p);
          maybeStartNext();
        });

      active.add(p);
      this.jobPromises.add(p);
      p.finally(() => this.jobPromises.delete(p));
      maybeStartNext();
    };

    for (let i = 0; i < this.maxProcesses; i++) maybeStartNext();

    while (!this.shuttingDown || active.size > 0) {
      await Promise.race([...(active.size > 0 ? active : []), new Promise((r) => setTimeout(r, 200))]);
    }
  }

  /**
   * Wait until all jobs have been processed — including any pending in the sharedQueue.
   * This resolves when the queue is empty and no jobs are still running.
   * Safe to call repeatedly; returns immediately if no jobs remain.
   * @returns {Promise<void>}
   */
  async waitForEmptyQueue() {
    await new Promise((r) => setTimeout(r, 1000));
    while (true) {
      const queueEmpty = this.sharedQueue.length === 0;
      const activeJobs = this.jobPromises.size;
      if (queueEmpty && activeJobs === 0) return;
      // Wait briefly before checking again to avoid busy loop
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  /**
   * Gracefully stops the runner: disallows new jobs, waits for in-progress jobs to finish.
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.shuttingDown || this.aborted) return;
    console.error('Waiting for jobs to finish before shutting down runner...');
    this.shuttingDown = true;
    this.emit('shutdown');

    // Unblock pending consumers
    for (const resolve of this.waitingResolvers) resolve(null);
    this.waitingResolvers.clear();

    await Promise.allSettled(this.jobPromises);
    if (this.hostTasks) await Promise.allSettled(this.hostTasks);

    console.error('All jobs complete. Runner stopped.');
    this.emit('stopped');
  }

  /**
   * Immediately aborts all running jobs and terminates active SSH processes.
   * Triggered automatically by SIGINT.
   * @returns {void}
   */
  abort() {
    if (this.aborted) {
      process.exit(); // Force kill on second attempt
    }
    this.aborted = true;
    console.error('\nAborting all jobs...');
    this.emit('abort');

    for (const resolve of this.waitingResolvers) resolve(null);
    this.waitingResolvers.clear();

    for (const child of this.activeChildren) {
      try {
        process.kill(child.pid, 'SIGTERM');
      } catch {
        // ignore already exited
      }
    }
    process.exit();
  }
}
