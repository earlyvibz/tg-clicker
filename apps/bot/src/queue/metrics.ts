import { updateQueue } from "./updateQueue";
import { QUEUE_CONFIG } from "../constants";

interface Metrics {
  success: number;
  skipped: number;
  invalid_session: number;
  rate_limit: number;
  other_errors: number;
}

const metrics: Metrics = {
  success: 0,
  skipped: 0,
  invalid_session: 0,
  rate_limit: 0,
  other_errors: 0,
};

let lastReportTime = Date.now();
let lastMetrics = { ...metrics };

export function incrementMetric(metric: keyof Metrics) {
  metrics[metric]++;
}

export function incrementError(type: "rate_limit" | "other") {
  if (type === "rate_limit") {
    metrics.rate_limit++;
  } else {
    metrics.other_errors++;
  }
}

export function startMetricsReporting() {
  setInterval(async () => {
    const now = Date.now();
    const elapsed = (now - lastReportTime) / 1000;

    const waiting = await updateQueue.getWaitingCount();
    const active = await updateQueue.getActiveCount();
    const delayed = await updateQueue.getDelayedCount();
    const failed = await updateQueue.getFailedCount();

    const successDelta = metrics.success - lastMetrics.success;
    const rate = Math.round(successDelta / elapsed);

    const rateLimitDelta = metrics.rate_limit - lastMetrics.rate_limit;

    const totalPending = waiting + delayed;
    const loadStatus =
      totalPending > 1000
        ? "🔴 OVERLOAD"
        : totalPending > 500
        ? "🟡 HIGH"
        : "🟢 NORMAL";

    console.log(
      `[Metrics] ${loadStatus} Queue: ${waiting}W ${active}A ${delayed}D ${failed}F | Rate: ${rate}/s | Success: ${successDelta} | Skipped: ${
        metrics.skipped - lastMetrics.skipped
      } | 429: ${rateLimitDelta}`
    );

    lastMetrics = { ...metrics };
    lastReportTime = now;
  }, QUEUE_CONFIG.METRICS_REPORT_INTERVAL);

  console.log("[Metrics] Metrics reporting started");
}

export function getRateLimitCount(): number {
  return metrics.rate_limit;
}

export function resetRateLimitCount() {
  metrics.rate_limit = 0;
}
