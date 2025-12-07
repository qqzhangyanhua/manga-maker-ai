import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

const createTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !port || !user || !pass) {
    throw new Error("邮件服务环境变量缺失，请检查 EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASSWORD");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
};

export const sendVerificationEmail = async (to: string, code: string) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) {
    throw new Error("缺少 EMAIL_FROM 或 EMAIL_USER，用于邮件发件人");
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: "ComicAI 注册验证码",
    text: `您的验证码是 ${code} ，10 分钟内有效。如非本人操作，请忽略此邮件。`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111;">
        <p>您好，</p>
        <p>您的 ComicAI 注册验证码为：</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>验证码将在 10 分钟后失效，如非本人操作请忽略。</p>
        <p style="color: #888; font-size: 12px;">本邮件由系统自动发送，请勿直接回复。</p>
      </div>
    `,
  });
};
