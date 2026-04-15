import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and return payload (email, name, picture, sub).
 * Throws if token is invalid.
 */
export async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}
