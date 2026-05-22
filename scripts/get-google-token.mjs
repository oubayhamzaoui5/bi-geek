/**
 * One-time script to get a Google OAuth refresh token for the calendar account
 * that should own the generated Google Meet links.
 *
 * Google no longer supports the old out-of-band copy/paste code flow for new
 * OAuth clients, so this script uses a localhost redirect instead.
 *
 * Usage:
 *   1. Create an OAuth client in Google Cloud Console:
 *      APIs & Services -> Credentials -> Create credentials -> OAuth client ID
 *      Application type: Web application
 *      Authorized redirect URI: http://127.0.0.1:3003/oauth2callback
 *   2. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 *   3. Run: node scripts/get-google-token.mjs
 *   4. Open the URL, sign in with the Gmail/Workspace account that owns Calendar
 *   5. Copy the printed GOOGLE_REFRESH_TOKEN into .env.local
 */

import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { google } from "googleapis"

const PORT = Number(process.env.GOOGLE_OAUTH_PORT || 3003)
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`
const ENV_PATH = resolve(process.cwd(), ".env.local")

function loadLocalEnv() {
  if (!existsSync(ENV_PATH)) return
  const text = readFileSync(ENV_PATH, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
  }
}

loadLocalEnv()

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local.")
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/calendar"],
})

console.log("\nGoogle OAuth")
console.log("1. Make sure this redirect URI is allowed in your OAuth client:")
console.log(`   ${REDIRECT_URI}`)
console.log("2. Open this URL and sign in with the calendar owner account:")
console.log(`   ${authUrl}\n`)

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", REDIRECT_URI)
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404)
      res.end("Not found")
      return
    }

    const error = url.searchParams.get("error")
    if (error) throw new Error(error)

    const code = url.searchParams.get("code")
    if (!code) throw new Error("No authorization code was returned by Google.")

    const { tokens } = await oauth2.getToken(code)
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token. Re-run the script and keep prompt=consent.")
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end("<h1>Google token created</h1><p>You can close this tab and return to the terminal.</p>")

    console.log("\nAdd or update these values in .env.local:")
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log("GOOGLE_CALENDAR_ID=primary")
    console.log("GOOGLE_CALENDAR_TIMEZONE=Africa/Algiers")
    console.log("")
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" })
    res.end(message)
    console.error("Error:", message)
  } finally {
    server.close()
  }
})

server.listen(PORT, "127.0.0.1")
