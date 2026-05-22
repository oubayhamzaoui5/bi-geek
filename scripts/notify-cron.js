/**
 * Daily 8am notification script.
 * Run: node scripts/notify-cron.js
 * Requires: npm install node-cron (or pnpm add node-cron)
 *
 * Or call the API directly:
 *   curl -X POST http://localhost:3000/api/cron/notify-sessions \
 *        -H "x-cron-secret: bi-geek-cron-2024"
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const CRON_SECRET = process.env.CRON_SECRET || "bi-geek-cron-2024"

async function sendNotifications() {
  console.log(`[${new Date().toISOString()}] Sending session notifications...`)
  try {
    const res = await fetch(`${SITE_URL}/api/cron/notify-sessions`, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET },
    })
    const data = await res.json()
    console.log(`Sent: ${data.sent ?? 0} notifications`)
  } catch (err) {
    console.error("Failed to send notifications:", err)
  }
}

// Try to use node-cron if installed, otherwise run once immediately
try {
  const cron = require("node-cron")
  // Run every day at 8:00 AM
  cron.schedule("0 8 * * *", sendNotifications)
  console.log("Cron scheduled: daily at 08:00")
} catch {
  // node-cron not installed — run once (useful for testing or Windows Task Scheduler)
  sendNotifications()
}
