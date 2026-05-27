import nodemailer from "nodemailer"

type SessionEmailItem = {
  id?: string | null
  title?: string | null
  groupTitle?: string | null
  date?: string | null
  startTime?: string | null
  duration?: number | null
  notes?: string | null
  joinUrl?: string | null
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASSWORD,
  },
})

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatDateFr(value?: string | null) {
  if (!value) return ""
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatDuration(minutes?: number | null) {
  const total = Number(minutes || 0)
  if (!total) return ""
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`
  if (h) return `${h}h`
  return `${m} min`
}

function lines(parts: Array<string | false | null | undefined>) {
  return parts.filter((part): part is string => typeof part === "string" && part.length > 0).join("\n")
}

function greeting(name?: string) {
  return `Bonjour${name ? ` ${name}` : ""},`
}

async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  if (!to) return
  await transporter.sendMail({
    from: `"BI Geek" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  })
}

export async function sendWelcomeEmail({
  to,
  username,
  password,
  name,
}: {
  to: string
  username: string
  password: string
  name?: string
}) {
  await sendCredentialsEmail({
    to,
    username,
    password,
    name,
    subject: "Vos identifiants BI Geek",
    title: "Bienvenue sur BI Geek",
    intro: "Votre compte a ete cree. Voici vos identifiants de connexion.",
  })
}

export async function sendCredentialsEmail({
  to,
  username,
  password,
  name,
  subject = "Vos identifiants BI Geek",
  title = "Vos identifiants BI Geek",
  intro = "Voici vos identifiants de connexion.",
}: {
  to: string
  username: string
  password: string
  name?: string
  subject?: string
  title?: string
  intro?: string
}) {
  await sendMail({
    to,
    subject,
    text: lines([
      title,
      "",
      greeting(name),
      "",
      intro,
      "",
      `Nom d'utilisateur : ${username}`,
      `Mot de passe : ${password}`,
      "",
      "Pour votre securite, changez ce mot de passe apres votre prochaine connexion.",
      "",
      "BI Geek",
    ]),
  })
}

export async function sendPasswordResetCodeEmail({
  to,
  name,
  code,
}: {
  to: string
  name?: string
  code: string
}) {
  const text = lines([
    "Reinitialisation du mot de passe",
    "",
    greeting(name),
    "",
    "Utilisez ce code pour definir un nouveau mot de passe. Il expire dans 15 minutes.",
    "",
    `Code de verification : ${code}`,
    "",
    "Ne partagez jamais ce code. Si vous n'avez pas demande cette reinitialisation, ignorez cet email.",
    "",
    "BI Geek",
  ])

  await sendMail({
    to,
    subject: "Code de verification BI Geek",
    text,
    html: `
      <pre>${escapeHtml("Reinitialisation du mot de passe\n\n")}${escapeHtml(greeting(name))}${escapeHtml("\n\nUtilisez ce code pour definir un nouveau mot de passe. Il expire dans 15 minutes.\n\nCode de verification : ")}</pre>
      <div style="font-size:32px;letter-spacing:8px;font-weight:800">${escapeHtml(code)}</div>
      <pre>${escapeHtml("\nNe partagez jamais ce code. Si vous n'avez pas demande cette reinitialisation, ignorez cet email.\n\nBI Geek")}</pre>
    `,
  })
}

export async function sendDailySessionEmail({
  to,
  name,
  role,
  sessions,
}: {
  to: string
  name?: string
  role: "student" | "instructor"
  sessions: SessionEmailItem[]
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bi-geek.net"
  const title = role === "instructor" ? "Vos séances d'aujourd'hui" : "Vos séances du jour"
  const date = formatDateFr(sessions[0]?.date)

  const sessionLines = sessions.flatMap((session, index) => {
    const access = session.joinUrl
      ? "Lien Meet disponible dans votre espace BI Geek."
      : role === "instructor"
        ? "Merci de creer le lien Meet dans la plateforme."
        : "Lien Meet en attente."
    const confirmLine =
      role === "student" && session.id
        ? `   Confirmer votre presence : ${baseUrl}/student-dashboard/seance/${session.id}`
        : ""
    return [
      `${index + 1}. ${session.title || "Seance de formation"}`,
      `   Groupe : ${session.groupTitle || "Groupe"}`,
      `   Heure : ${session.startTime || "--:--"}${session.duration ? ` (${formatDuration(session.duration)})` : ""}`,
      `   Acces : ${access}`,
      session.notes ? `   Notes : ${session.notes}` : "",
      confirmLine,
      "",
    ]
  })

  const htmlSessions = sessions
    .map((session) => {
      const access = session.joinUrl
        ? "Lien Meet disponible dans votre espace BI Geek."
        : role === "instructor"
          ? "Merci de créer le lien Meet dans la plateforme."
          : "Lien Meet en attente."
      const confirmUrl =
        role === "student" && session.id
          ? `${baseUrl}/student-dashboard/seance/${escapeHtml(session.id)}`
          : null
      const btn = confirmUrl
        ? `<a href="${confirmUrl}" style="display:inline-block;margin-top:14px;background:#7c3aed;color:#fff;text-decoration:none;padding:11px 22px;border-radius:9px;font-size:13px;font-weight:700;">Confirmer ma présence →</a>`
        : ""
      return `
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;">
          <p style="color:#7c3aed;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 3px;">${escapeHtml(session.groupTitle || "Groupe")}</p>
          <p style="color:#111827;font-size:16px;font-weight:700;margin:0 0 10px;line-height:1.3;">${escapeHtml(session.title || "Séance de formation")}</p>
          <p style="color:#6b7280;font-size:12px;margin:0 0 3px;">🗓 <span style="text-transform:capitalize;">${escapeHtml(formatDateFr(session.date))}</span></p>
          <p style="color:#6b7280;font-size:12px;margin:0 0 3px;">🕐 ${escapeHtml(session.startTime || "--:--")}${session.duration ? ` · ${escapeHtml(formatDuration(session.duration))}` : ""}</p>
          <p style="color:#6b7280;font-size:12px;margin:0;">${escapeHtml(access)}</p>
          ${session.notes ? `<p style="color:#9ca3af;font-size:11px;margin:6px 0 0;font-style:italic;">${escapeHtml(session.notes)}</p>` : ""}
          ${btn}
        </div>`
    })
    .join("")

  const instructorWarning =
    role === "instructor"
      ? `<p style="color:#b45309;font-size:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin:0 0 18px;">⚠️ Pensez à créer le lien Meet depuis la plateforme avant chaque séance.</p>`
      : ""

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:16px;background:#f3f4f6;">
      <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:22px 24px;">
          <p style="color:#fff;font-size:20px;font-weight:800;margin:0;letter-spacing:-.4px;">BI Geek</p>
          <p style="color:rgba(255,255,255,.75);font-size:13px;margin:4px 0 0;">${escapeHtml(title)}</p>
        </div>
        <div style="padding:22px 24px;">
          <p style="color:#374151;font-size:14px;margin:0 0 4px;font-weight:600;">${escapeHtml(greeting(name))}</p>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Voici votre programme du <strong style="color:#374151;">${escapeHtml(date)}</strong>.</p>
          ${instructorWarning}
          ${htmlSessions}
          <p style="color:#d1d5db;font-size:11px;margin:20px 0 0;text-align:center;">BI Geek · contact@bi-geek.net</p>
        </div>
      </div>
    </div>`

  await sendMail({
    to,
    subject: "Rappel de vos séances BI Geek aujourd'hui",
    text: lines([
      title,
      "",
      greeting(name),
      "",
      `Voici votre programme du ${date}.`,
      "",
      role === "instructor" ? "Important : creez le lien Meet directement depuis la plateforme avant le debut de chaque seance." : "",
      ...sessionLines,
      "BI Geek",
    ]),
    html,
  })
}

export async function sendMeetLinkCreatedEmail({
  to,
  name,
  session,
}: {
  to: string
  name?: string
  session: SessionEmailItem
}) {
  await sendMail({
    to,
    subject: "Lien Meet disponible pour votre seance",
    text: lines([
      "Lien Meet disponible pour votre seance",
      "",
      greeting(name),
      "",
      "Le formateur a cree le lien Meet pour votre seance.",
      "Vous pouvez le retrouver dans votre espace BI Geek.",
      "",
      `Seance : ${session.title || "Seance de formation"}`,
      `Groupe : ${session.groupTitle || "Groupe"}`,
      `Date : ${formatDateFr(session.date)}`,
      `Heure : ${session.startTime || "--:--"}`,
      session.duration ? `Duree : ${formatDuration(session.duration)}` : "",
      "",
      "BI Geek",
    ]),
  })
}

export async function sendUsernameReminderEmail({
  to,
  users,
}: {
  to: string
  users: Array<{ username: string; name?: string; surname?: string; role?: string }>
}) {
  const accountLines = users.flatMap((user, index) => {
    const fullName = [user.name, user.surname].filter(Boolean).join(" ")
    return [
      `${index + 1}. ${fullName || "Compte BI Geek"}`,
      `   Nom d'utilisateur : ${user.username}`,
      user.role ? `   Profil : ${user.role}` : "",
      "",
    ]
  })

  await sendMail({
    to,
    subject: "Rappel de votre identifiant BI Geek",
    text: lines([
      "Rappel de votre identifiant BI Geek",
      "",
      "Bonjour,",
      "",
      users.length > 1
        ? "Plusieurs comptes BI Geek sont associes a cette adresse email :"
        : "Voici le nom d'utilisateur associe a votre adresse email :",
      "",
      ...accountLines,
      "BI Geek",
    ]),
  })
}

export async function sendNewActivityEmail({
  to,
  name,
  type,
  title,
  groupTitle,
  url,
}: {
  to: string
  name?: string
  type: "quiz" | "devoir"
  title: string
  groupTitle: string
  url?: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bi-geek.net"
  const link = url || `${baseUrl}/student-dashboard/groups`
  const typeLabel = type === "quiz" ? "Quiz" : "Devoir"
  const subject = type === "quiz"
    ? `Nouveau quiz disponible — ${groupTitle}`
    : `Nouveau devoir disponible — ${groupTitle}`

  const btn = `<a href="${escapeHtml(link)}" style="display:inline-block;margin-top:14px;background:#7c3aed;color:#fff;text-decoration:none;padding:11px 22px;border-radius:9px;font-size:13px;font-weight:700;">Voir le ${typeLabel.toLowerCase()} →</a>`

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:16px;background:#f3f4f6;">
      <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:22px 24px;">
          <p style="color:#fff;font-size:20px;font-weight:800;margin:0;letter-spacing:-.4px;">BI Geek</p>
          <p style="color:rgba(255,255,255,.75);font-size:13px;margin:4px 0 0;">Nouveau ${typeLabel.toLowerCase()} disponible</p>
        </div>
        <div style="padding:22px 24px;">
          <p style="color:#374151;font-size:14px;margin:0 0 16px;font-weight:600;">${escapeHtml(greeting(name))}</p>
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
            <p style="color:#7c3aed;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 4px;">${escapeHtml(groupTitle)}</p>
            <p style="color:#111827;font-size:16px;font-weight:700;margin:0 0 6px;">${escapeHtml(title)}</p>
            <p style="color:#6b7280;font-size:12px;margin:0;">Votre formateur a ajouté un nouveau ${typeLabel.toLowerCase()}.</p>
            ${btn}
          </div>
          <p style="color:#d1d5db;font-size:11px;margin:20px 0 0;text-align:center;">BI Geek · contact@bi-geek.net</p>
        </div>
      </div>
    </div>`

  await sendMail({
    to,
    subject,
    text: lines([
      subject,
      "",
      greeting(name),
      "",
      `Votre formateur a ajoute un nouveau ${typeLabel.toLowerCase()} dans le groupe "${groupTitle}".`,
      "",
      `Titre : ${title}`,
      "",
      `Consulter : ${link}`,
      "",
      "BI Geek",
    ]),
    html,
  })
}
