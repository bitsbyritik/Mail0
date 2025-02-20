import { createDriver } from "@/app/api/driver";
import { sendMailSchema } from "@/types/schema";
import { account, user } from "@/db/schema";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import base64url from "base64url";
import { eq } from "drizzle-orm";
import { db } from "@/db";

export const POST = async (req: NextRequest) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const [foundAccount] = await db
      .select()
      .from(account)
      .where(eq(account.userId, session.user.id));

    if (!foundAccount?.accessToken || !foundAccount.refreshToken) {
      return new Response("Unauthorized, reconnect", { status: 401 });
    }

    const driver = await createDriver(foundAccount.providerId, {
      auth: {
        access_token: foundAccount.accessToken,
        refresh_token: foundAccount.refreshToken,
      },
    });

    const [foundUser] = await db.select().from(user).where(eq(user.id, session.user.id));
    const userEmail = foundUser?.email;

    const data = await req.json();
    const parsedData = sendMailSchema.safeParse(data);

    if (!parsedData.data) {
      return new Response("Incorrect input field", { status: 400 });
    }

    const { to, subject, message } = parsedData.data;

    const emailContent = [
      `To: ${to}`,
      `From: ${userEmail}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      message,
    ].join("\n");

    const encodedMessage = base64url(emailContent);

    const sendMail = await driver.create(encodedMessage);

    console.log(sendMail);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};
