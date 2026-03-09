import { SessionQR, Webhook } from "../types";

type WebhookApiResponse = Omit<Webhook, "events"> & {
  events?: string[];
  eventsJson?: string[];
};

export function mapWebhook(response: WebhookApiResponse): Webhook {
  return {
    ...response,
    events: response.events ?? response.eventsJson ?? []
  };
}

export function mapSessionQr(response: { qr?: string; qrString?: string; qrBase64?: string }): SessionQR {
  if (response.qr) {
    return {
      qr: response.qr,
      qrString: response.qr,
      qrBase64: response.qr.startsWith("data:image") ? response.qr : undefined
    };
  }

  return {
    qr: response.qrString ?? response.qrBase64,
    qrString: response.qrString,
    qrBase64: response.qrBase64
  };
}
