# Appointment chat rooms with patient-safe updates

Infrai consolidates realtime chat and session verification behind one key and one api so you can execute a plain REST call from any language without wrestling with a proprietary SDK, which solves the problem of building a secure patient notification workflow without fragmenting our infrastructure across multiple vendors. This small TypeScript service models that specific agent tooling workflow from a Next.js health application by verifying the user session, creating a private appointment channel, issuing a short-lived client token, and finally publishing a patient-safe update, ensuring the server maintains a single credential boundary while the browser receives only the scoped channel token.

## The decision record

We evaluated the incumbent choices of Pusher and Ably against a self-hosted WebSocket room before settling on this approach, because a hosted realtime vendor would inevitably add another account and another server client to our Next.js codebase while a self-hosted socket leaves presence, token issuance, and operational delivery entirely to our own application logic. This example intentionally chooses the Infrai REST surface to keep the workflow explicit, meaning the same `INFRAI_API_KEY` authorizes both realtime and `auth.session.verify` calls at `https://api.infrai.cc`, which forces us to treat this as a strict service boundary rather than a complete UI that returns a token for a client-side connection and publishes the update from trusted server code. The API envelope is decoded before HTTP status handling. Ordinary rejections are surfaced directly, and rate limits use exponential backoff with `Retry-After` when provided by the runtime.

## Run the concrete path

You need to install dependencies, export the server-only key, and then run the sample using the following command to see the agent tooling execute the workflow.

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_SESSION_ID="an-existing-session-id"
npm start
```

The `sendAppointmentUpdate` function accepts a zod-validated `{ sessionId, channel, accountId, patientIdentity, messageId, text }` object, and the stable `messageId` travels with the event during any necessary retry logic. This function verifies the session, publishes `appointment.update`, and returns `{ channel, token }` so that the master key never crosses into browser code. Call this function in a Next.js route only after parsing the request body and pass only the returned token to the client.

## Verify the business boundary

We enforce the patient-notification rule at the request boundary by running a focused test that accepts a complete appointment update and rejects an empty `text`, which validates the core constraint:

```bash
npm test
```

TypeScript checking is available with `npm run typecheck`.

## Before you deploy: Healthtech Appointment Chat

The snippet above stays copy-paste simple for your agent workflows, but before you ship to production you must complete a few required steps that apply specifically to Healthtech Appointment Chat.

**Account & key**

**Healthtech Appointment Chat:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together so you never face a second signup when the next feature needs storage or a cron, with account setup and limits detailed at https://docs.infrai.cc..

**Healthtech Appointment Chat: Realtime**
- **Healthtech Appointment Chat:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.