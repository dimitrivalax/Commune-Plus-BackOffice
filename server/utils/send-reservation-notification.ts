import { getFCMAccessToken, getFCMProjectId } from "./fcm-auth";
import { sendEmail } from "./emails";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SendReservationNotificationOptions {
  supabase: SupabaseClient;
  reservationId: string;
  userEmail: string;
  userName: string;
  salleName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "confirmée" | "refusée";
}

/**
 * Envoie une notification push et un email à l'utilisateur pour sa réservation
 */
export async function sendReservationNotification(
  options: SendReservationNotificationOptions,
): Promise<{
  push_success: boolean;
  email_success: boolean;
  tokens_sent: number;
  errors?: string[];
}> {
  const {
    supabase,
    reservationId,
    userEmail,
    userName,
    salleName,
    date,
    startTime,
    endTime,
    status,
  } = options;

  const title =
    status === "confirmée" ? "Réservation confirmée" : "Réservation refusée";
  const body =
    status === "confirmée"
      ? `Votre réservation pour la salle "${salleName}" le ${date} est confirmée.`
      : `Désolé, votre réservation pour la salle "${salleName}" le ${date} a été refusée.`;

  const result = {
    push_success: false,
    email_success: false,
    tokens_sent: 0,
    errors: [] as string[],
  };

  // 1. Envoi de la notification Push
  try {
    let accessToken: string;
    let projectId: string;

    try {
      accessToken = await getFCMAccessToken();
      projectId = await getFCMProjectId();

      // Récupérer les tokens associés à cet email
      const { data: pushTokens, error: tokensError } = await supabase
        .from("push_tokens")
        .select("token, platform")
        .eq("email", userEmail.toLowerCase())
        .eq("is_active", true);

      if (tokensError) {
        throw new Error(`Error fetching tokens: ${tokensError.message}`);
      }

      if (pushTokens && pushTokens.length > 0) {
        for (const t of pushTokens) {
          try {
            const message: any = {
              message: {
                token: t.token,
                notification: { title, body },
                data: {
                  type: "reservation",
                  reservation_id: String(reservationId),
                  status: status,
                },
                android: {
                  priority: "high",
                  notification: {
                    sound: "default",
                    channel_id: "default",
                    tag: `reservation_${reservationId}`,
                  },
                },
              },
            };

            if (t.platform === "ios") {
              message.message.apns = {
                headers: {
                  "apns-topic": "com.communeplus.app",
                },
                payload: {
                  aps: {
                    sound: "default",
                    badge: 1,
                    alert: { title, body },
                  },
                },
              };
            }

            const response = await fetch(
              `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(message),
              },
            );

            if (response.ok) {
              result.tokens_sent++;
            } else {
              const errData = await response.json();
              result.errors.push(
                `FCM Error (${t.platform}): ${JSON.stringify(errData)}`,
              );
            }
          } catch (e: any) {
            result.errors.push(`Push error for token: ${e.message}`);
          }
        }
        result.push_success = result.tokens_sent > 0;
      }
    } catch (fcmInitError: any) {
      console.warn("FCM not configured or failed:", fcmInitError.message);
      result.errors.push(`FCM Config: ${fcmInitError.message}`);
    }
  } catch (error: any) {
    console.error("Push notification failed:", error);
    result.errors.push(`Global push error: ${error.message}`);
  }

  // 2. Envoi de l'Email
  try {
    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: ${status === "confirmée" ? "#10b981" : "#ef4444"};">${title}</h2>
        <p>Bonjour ${userName},</p>
        <p>${body}</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Salle :</strong> ${salleName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Date :</strong> ${date}</p>
          <p style="margin: 5px 0 0 0;"><strong>Horaire :</strong> ${startTime} - ${endTime}</p>
        </div>
        <p>Vous pouvez consulter les détails de votre réservation sur l'application mobile Commune Plus.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280;">Ceci est un message automatique, merci de ne pas y répondre.</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: userEmail,
      subject: `[Commune Plus] ${title}`,
      html: emailHtml,
    });

    result.email_success = emailResult.success;
    if (!emailResult.success) {
      result.errors.push(`Email error: ${emailResult.error}`);
    }
  } catch (error: any) {
    console.error("Email sending failed:", error);
    result.errors.push(`Global email error: ${error.message}`);
  }

  return result;
}
