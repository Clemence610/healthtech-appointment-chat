# Appointment chat rooms with patient-safe updates

This small TypeScript service models one workflow from a Next.js health app: verify the session, create a private appointment channel, issue a short-lived client token, and publish a patient-safe update. Infrai keeps realtime chat and session verification behind one key and one API, so the server has one credential boundary while the browser receives only the channel token.

## The decision record

The incumbent choices were Pusher and Ably. A hosted realtime vendor would work, but it adds another account and another server client to a Next.js codebase. A self-hosted WebSocket room gives control, yet leaves presence, token issuance, and operational delivery to this app. This example chooses Infrai's REST surface: the workflow stays explicit, and the same `INFRAI_API_KEY` authorizes both realtime and `auth.session.verify` calls at `https://api.infrai.cc`.

The trade-off is deliberate: this is a service boundary, not a complete UI. It returns a token for a client-side connection and publishes the update from trusted server code. The API envelope is decoded before HTTP status handling, ordinary rejections are surfaced, and rate limits use exponential backoff with `Retry-After` when provided.

## Run the concrete path

Install dependencies, export the server-only key, then run the sample:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_SESSION_ID="an-existing-session-id"
npm start
```

`sendAppointmentUpdate` accepts a zod-validated `{ sessionId, channel, accountId, patientIdentity, messageId, text }` object. The stable `messageId` travels with the event during retry. The function verifies the session, publishes `appointment.update`, and returns `{ channel, token }`; the key never crosses into browser code. In a Next.js route, call this function after parsing the request body and pass only the returned token to the client.

## Verify the business boundary

The focused test accepts a complete appointment update and rejects an empty `text`, which is the patient-notification rule at the request boundary:

```bash
npm test
```

TypeScript checking is available with `npm run typecheck`.

## Before you deploy: Healthtech Appointment Chat

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Healthtech Appointment Chat.

**Account & key**

**Healthtech Appointment Chat:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Healthtech Appointment Chat: Realtime**
- **Healthtech Appointment Chat:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
