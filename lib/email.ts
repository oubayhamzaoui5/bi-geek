import nodemailer from "nodemailer"

type SessionEmailItem = {
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
  const title = role === "instructor" ? "Vos seances d'aujourd'hui" : "Vos seances du jour"
  const date = formatDateFr(sessions[0]?.date)
  const sessionLines = sessions.flatMap((session, index) => {
    const access = session.joinUrl
      ? "Lien Meet disponible dans votre espace BI Geek."
      : role === "instructor"
        ? "Merci de creer le lien Meet dans la plateforme."
        : "Lien Meet en attente."

    return [
      `${index + 1}. ${session.title || "Seance de formation"}`,
      `   Groupe : ${session.groupTitle || "Groupe"}`,
      `   Heure : ${session.startTime || "--:--"}${session.duration ? ` (${formatDuration(session.duration)})` : ""}`,
      `   Acces : ${access}`,
      session.notes ? `   Notes : ${session.notes}` : "",
      "",
    ]
  })

  await sendMail({
    to,
    subject: "Rappel de vos seances BI Geek aujourd'hui",
    text: lines([
      title,
      "",
      greeting(name),
      "",
      `Voici votre programme du ${date}.`,
      "",
      role === "instructor" ? "Important : creez le lien Meet directement depuis la plateforme avant le debut de chaque seance." : "",
      role === "instructor" ? "" : "",
      ...sessionLines,
      "BI Geek",
    ]),
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
