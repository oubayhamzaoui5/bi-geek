import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

export async function sendWelcomeEmail({
  to,
  username,
  password,
  name,
}: {
  to: string;
  username: string;
  password: string;
  name?: string;
}) {
  await transporter.sendMail({
    from: `"BI Geek" <${process.env.SMTP_USER}>`,
    to,
    subject: "Vos identifiants BI Geek",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Bienvenue${name ? ` ${name}` : ""} sur BI Geek !</h2>
        <p>Votre compte a été créé. Voici vos identifiants :</p>
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px;background:#f4f4f4;font-weight:bold">Nom d'utilisateur</td>
            <td style="padding:8px;background:#f9f9f9">${username}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#f4f4f4;font-weight:bold">Mot de passe</td>
            <td style="padding:8px;background:#f9f9f9">${password}</td>
          </tr>
        </table>
        <p style="margin-top:16px">
          Connectez-vous sur
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login">${process.env.NEXT_PUBLIC_SITE_URL}/login</a>
        </p>
        <p style="color:#888;font-size:12px">Changez votre mot de passe après votre première connexion.</p>
      </div>
    `,
  });
}
