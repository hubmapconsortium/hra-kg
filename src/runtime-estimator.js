// runtime-estimator.js
// A robust runtime estimator using a sliding window throughput average.
// Includes ETA, throughput (jobs/sec), average job duration, and JSON summary export.

export class RuntimeEstimator {
  /**
   * @param {object} options
   * @param {number} options.windowSeconds - How far back to look (e.g., 3600 = 1 hour)
   * @param {number} [options.minSamples=10] - Minimum samples before estimating ETA
   * @param {number} [options.precision=2] - Decimal precision for throughput display
   */
  constructor({ windowSeconds, minSamples = 10, precision = 2 } = {}) {
    this.windowSeconds = windowSeconds;
    this.minSamples = minSamples;
    this.precision = precision;

    this.startTime = null;
    this.totalJobs = 0;
    this.completedJobs = 0;
    this.samples = []; // [timestamp (ms), cumulativeCompleted]
  }

  /**
   * Start tracking a new batch of jobs.
   * @param {number} totalJobs
   */
  start(totalJobs) {
    this.startTime = performance.now();
    this.totalJobs = totalJobs;
    this.completedJobs = 0;
    this.samples = [];
  }

  /**
   * Call this once per completed job.
   */
  markJobComplete() {
    if (!this.totalJobs) return; // avoid divide-by-zero conditions
    this.completedJobs++;
    const now = performance.now();
    this.samples.push([now, this.completedJobs]);

    // Efficiently drop old samples beyond window
    const cutoff = now - this.windowSeconds * 1000;
    while (this.samples.length && this.samples[0][0] < cutoff) {
      this.samples.shift();
    }
  }

  /**
   * Compute average throughput (jobs/sec) over the sliding window.
   */
  _getThroughput() {
    if (this.samples.length < this.minSamples) return null;
    const [oldestTime, oldestCount] = this.samples[0];
    const [latestTime, latestCount] = this.samples.at(-1);
    const elapsedSec = (latestTime - oldestTime) / 1000;
    if (elapsedSec <= 0) return null;
    return (latestCount - oldestCount) / elapsedSec;
  }

  /**
   * Compute average job duration (in seconds) from throughput.
   */
  _getAverageDuration() {
    const throughput = this._getThroughput();
    return throughput ? 1 / throughput : null;
  }

  /**
   * Estimate remaining time, throughput, and progress.
   */
  getEstimate() {
    if (!this.startTime || !this.totalJobs) {
      return {
        secondsRemaining: null,
        progress: 0,
        etaDate: null,
        throughput: null,
        avgDuration: null,
      };
    }

    const throughput = this._getThroughput();
    const progress = this.completedJobs / this.totalJobs;

    if (!throughput || this.completedJobs < this.minSamples) {
      return {
        secondsRemaining: null,
        progress,
        etaDate: null,
        throughput: null,
        avgDuration: null,
      };
    }

    const remainingJobs = Math.max(0, this.totalJobs - this.completedJobs);
    const secondsRemaining = Math.max(0, remainingJobs / throughput);

    // Use consistent time origin for ETA
    const wallNow = performance.timeOrigin + performance.now();
    const etaDate = new Date(wallNow + secondsRemaining * 1000);
    const avgDuration = 1 / throughput;

    return {
      secondsRemaining,
      progress,
      etaDate,
      throughput,
      avgDuration,
    };
  }

  /**
   * Return a human-readable ETA string with diagnostics.
   */
  getPrettyEstimate() {
    const { secondsRemaining, progress, etaDate, throughput, avgDuration } = this.getEstimate();
    const pct = (progress * 100).toFixed(1);
    const completed = `${this.completedJobs} / ${this.totalJobs}`;

    if (secondsRemaining == null) {
      return `${completed} complete — ${pct}% — estimating...`;
    }

    const days = Math.floor(secondsRemaining / 86400);
    const hrs = Math.floor((secondsRemaining % 86400) / 3600);
    const mins = Math.floor((secondsRemaining % 3600) / 60);
    const secs = Math.floor(secondsRemaining % 60);

    // Format remaining time
    let timeStr = '';
    if (days > 0) {
      timeStr = `${days}d ${hrs}h ${mins}m ${secs}s`;
    } else if (hrs > 0) {
      timeStr = `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      timeStr = `${mins}m ${secs}s`;
    } else {
      timeStr = `${secs}s`;
    }
    
    // Format ETA date/time
    const etaStr = etaDate.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const throughputStr = throughput ? (throughput * 60 * 60).toFixed(this.precision) : '?';
    const avgDurStr = avgDuration ? avgDuration.toFixed(this.precision) : '?'; // in s

    return (
      `Progress: ${completed} (${pct}%) jobs completed | ~${timeStr} remaining, ` +
      `finishing ~${etaStr} | ${throughputStr} jobs/hr | avg ${avgDurStr} sec/job`
    );
  }

  /**
   * Return structured metrics for logs or monitoring.
   */
  getSummary() {
    const { secondsRemaining, progress, etaDate, throughput, avgDuration } = this.getEstimate();
    return {
      timestamp: new Date().toISOString(),
      completed: this.completedJobs,
      total: this.totalJobs,
      progressPercent: +(progress * 100).toFixed(2),
      eta: etaDate ? etaDate.toISOString() : null,
      secondsRemaining: secondsRemaining ? Math.round(secondsRemaining) : null,
      throughput: throughput ? +throughput.toFixed(this.precision) : null,
      avgMsPerJob: avgDuration ? +(avgDuration * 1000).toFixed(0) : null,
    };
  }
}
