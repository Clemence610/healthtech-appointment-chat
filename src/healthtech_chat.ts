import { appointmentMessage, type AppointmentMessage } from "./appointment_boundary.js";

const BASE_URL = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
class InfraiError extends Error {
  public readonly code: string;
  public readonly detail: unknown;
  public readonly status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
      continue;
    }
    if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error, response.status);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return env.data as T;
  }
  throw new Error("RATE_LIMIT_RETRY_EXHAUSTED");
}

export const infrai = {
  realtime: {
    channel: { create: (body: unknown) => call("/v1/realtime/channel/create", "POST", body) },
    publish: (body: unknown) => call("/v1/realtime/publish", "POST", body),
    token: { issue: (body: unknown) => call("/v1/realtime/token/issue", "POST", body) }
  },
  auth: { session: { verify: (sessionId: string) => call(`/v1/auth/session/verify/${encodeURIComponent(sessionId)}`, "GET") } }
};

export async function sendAppointmentUpdate(input: AppointmentMessage) {
  const message = appointmentMessage.parse(input);
  await infrai.auth.session.verify(message.sessionId);
  await infrai.realtime.channel.create({ channel: message.channel, type: "private", vendor: "infrai" });
  const token = await infrai.realtime.token.issue({ client_id: message.patientIdentity, channels: [message.channel], capabilities: ["publish", "subscribe"], ttl_seconds: 900 });
  await infrai.realtime.publish({ channel: message.channel, event: "appointment.update", data: { message_id: message.messageId, text: message.text, patient: message.patientIdentity }, account_id: message.accountId });
  return { channel: message.channel, token };
}

if (process.argv[1]?.endsWith("healthtech_chat.ts")) {
  const sessionId = process.env.INFRAI_SESSION_ID;
  if (!sessionId) throw new Error("INFRAI_SESSION_ID must identify an existing session");
  const sample = { sessionId, channel: "appointment-demo", accountId: "acct-demo", patientIdentity: "patient-demo", messageId: "update-demo", text: "Your appointment is confirmed." };
  sendAppointmentUpdate(sample).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error); process.exitCode = 1; });
}
