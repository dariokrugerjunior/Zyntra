import axios from "axios";
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { getSessionStoragePath } from "../infra/storage/session-path";
import { getSocket, removeSocket, setSocket } from "./session.store";
import { env } from "../shared/utils/env";
import { logger } from "../shared/logger/logger";

type WorkerEvent = {
  eventType:
    | "session.qr"
    | "session.ready"
    | "session.disconnected"
    | "message.received"
    | "message.sent"
    | "message.error";
  companyId: string;
  sessionId: string;
  payload: Record<string, unknown>;
};

async function publishEvent(event: WorkerEvent) {
  await axios.post(`${env.BACKEND_INTERNAL_URL}/internal/worker/events`, event, {
    timeout: 10000,
    headers: { "X-Worker-Secret": env.WORKER_SECRET }
  });
}

function normalizeJid(to: string) {
  if (to.includes("@")) return to;
  const digits = to.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export async function startSession(companyId: string, sessionId: string) {
  const existing = getSocket<any>(companyId, sessionId);
  if (existing) return;

  const authPath = await getSessionStoragePath(companyId, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    auth: state,
    version
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    try {
      if (update.qr) {
        await publishEvent({
          eventType: "session.qr",
          companyId,
          sessionId,
          payload: { qrString: update.qr }
        });
      }

      if (update.connection === "open") {
        await publishEvent({
          eventType: "session.ready",
          companyId,
          sessionId,
          payload: { phoneNumber: socket.user?.id ?? null }
        });
      }

      if (update.connection === "close") {
        const statusCode = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;

        if (statusCode === DisconnectReason.restartRequired) {
          removeSocket(companyId, sessionId);
          logger.info({ companyId, sessionId }, "baileys requested restart, reconnecting session");
          setTimeout(() => {
            startSession(companyId, sessionId).catch((error) => {
              logger.error({ companyId, sessionId, err: error }, "failed to reconnect session after restartRequired");
            });
          }, 1200);
          return;
        }

        const reason =
          statusCode === DisconnectReason.loggedOut
            ? "logged_out"
            : statusCode === DisconnectReason.connectionReplaced
              ? "conflict"
              : "connection_closed";

        await publishEvent({
          eventType: "session.disconnected",
          companyId,
          sessionId,
          payload: { reason }
        });

        removeSocket(companyId, sessionId);
      }
    } catch (error) {
      logger.error({ companyId, sessionId, err: error }, "failed handling connection.update");
    }
  });

  socket.ev.on("messages.upsert", async (upsert) => {
    try {
      for (const msg of upsert.messages) {
        if (!msg.key.fromMe) {
          const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text;
          await publishEvent({
            eventType: "message.received",
            companyId,
            sessionId,
            payload: {
              from: msg.key.remoteJid,
              to: socket.user?.id ?? null,
              messageType: Object.keys(msg.message ?? {})[0] ?? "unknown",
              text: text ?? null,
              waMessageId: msg.key.id,
              raw: JSON.stringify(msg).slice(0, 800)
            }
          });
        }
      }
    } catch (error) {
      logger.error({ companyId, sessionId, err: error }, "failed handling messages.upsert");
    }
  });

  setSocket(companyId, sessionId, socket);
  logger.info({ companyId, sessionId }, "session started");
}

export async function stopSession(companyId: string, sessionId: string) {
  const socket = getSocket<any>(companyId, sessionId);
  if (socket) {
    socket.ws.close();
    removeSocket(companyId, sessionId);
  }
  logger.info({ companyId, sessionId }, "session stopped");
}

export async function sendText(companyId: string, sessionId: string, to: string, text: string) {
  const socket = getSocket<any>(companyId, sessionId);
  if (!socket) {
    throw new Error("session_not_running");
  }

  const jid = normalizeJid(to);
  const result = await socket.sendMessage(jid, { text });

  await publishEvent({
    eventType: "message.sent",
    companyId,
    sessionId,
    payload: {
      to,
      waMessageId: result?.key?.id,
      raw: JSON.stringify(result).slice(0, 500)
    }
  });
}

export async function sendMedia(
  companyId: string,
  sessionId: string,
  to: string,
  base64: string,
  mime: string,
  fileName?: string,
  caption?: string
) {
  const socket = getSocket<any>(companyId, sessionId);
  if (!socket) {
    throw new Error("session_not_running");
  }

  const jid = normalizeJid(to);
  const buffer = Buffer.from(base64, "base64");

  const result = await socket.sendMessage(jid, {
    document: buffer,
    mimetype: mime,
    fileName: fileName ?? "file",
    caption
  });

  await publishEvent({
    eventType: "message.sent",
    companyId,
    sessionId,
    payload: {
      to,
      waMessageId: result?.key?.id,
      raw: JSON.stringify(result).slice(0, 500)
    }
  });
}

export async function emitMessageError(companyId: string, sessionId: string, error: unknown) {
  await publishEvent({
    eventType: "message.error",
    companyId,
    sessionId,
    payload: { error: String((error as any)?.message ?? error) }
  });
}
