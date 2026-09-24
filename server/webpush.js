// Web Push helper: VAPID keys, subscription validation, sending with TTL.
// Private key is read ONLY from the environment (never hardcoded/committed).
// If VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are missing (local dev only),
// an ephemeral keypair is generated at startup so the feature still works.
// Production must set the env vars (see .env.example).

const webpush = require("web-push");

let ephemeralKeys = null;

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }
  if (!ephemeralKeys) {
    ephemeralKeys = webpush.generateVAPIDKeys();
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[webpush] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — using ephemeral dev keys. Set them in production (see .env.example)."
      );
    }
  }
  return { publicKey: ephemeralKeys.publicKey, privateKey: ephemeralKeys.privateKey };
}

function getVapidSubject() {
  return process.env.VAPID_SUBJECT || "mailto:admin@todo-app.local";
}

function getPublicKey() {
  return getVapidKeys().publicKey;
}

function validateSubscription(sub) {
  return Boolean(
    sub &&
      typeof sub.endpoint === "string" &&
      sub.endpoint.startsWith("https") &&
      sub.keys &&
      typeof sub.keys.p256dh === "string" &&
      typeof sub.keys.auth === "string"
  );
}

// Sends a push. Resolves:
//   "sent"  — delivered to the push service (HTTP 2xx)
//   "gone"  — subscription no longer valid (404/410), caller should remove it
//   { error } — other failure
async function sendPush(subscription, payload) {
  const { publicKey, privateKey } = getVapidKeys();
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        vapidDetails: {
          subject: getVapidSubject(),
          publicKey,
          privateKey,
        },
        // Rendered SUMMARY never logs the private key.
        TTL: 3600,
      }
    );
    return "sent";
  } catch (err) {
    const status = err && err.statusCode;
    if (status === 404 || status === 410) return "gone";
    if (status === 400 || status === 401 || status === 403) {
      // VAPID/аутентификация слишком старая — подписка может быть невалидна.
      return "gone";
    }
    return { error: err.message || "Push failed" };
  }
}

module.exports = { getVapidKeys, getPublicKey, getVapidSubject, validateSubscription, sendPush };