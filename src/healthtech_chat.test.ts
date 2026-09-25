import assert from "node:assert/strict";
import { appointmentMessage } from "./appointment_boundary.js";

const accepted = appointmentMessage.safeParse({ sessionId: "s1", channel: "appointment-42", accountId: "acct-1", patientIdentity: "patient-7", messageId: "update-1", text: "Your visit starts at 10:00." });
assert.equal(accepted.success, true);
const rejected = appointmentMessage.safeParse({ sessionId: "s1", channel: "appointment-42", accountId: "acct-1", patientIdentity: "patient-7", messageId: "update-1", text: "" });
assert.equal(rejected.success, false);
console.log("appointment message boundary: accepted valid update, rejected empty text");
