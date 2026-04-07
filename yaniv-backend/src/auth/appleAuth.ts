import { importJWK, jwtVerify, decodeProtectedHeader } from 'jose';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';

interface AppleClaims {
  sub: string;          // Stable Apple user identifier
  email?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

interface JWKSKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface JWKS {
  keys: JWKSKey[];
}

// Cache the JWKS in module scope for the lifetime of the Worker instance
// (Cloudflare Workers restart periodically; this is an acceptable trade-off)
let cachedJWKS: JWKS | null = null;
let cacheExpiresAt = 0;

async function getAppleJWKS(): Promise<JWKS> {
  const now = Date.now();
  if (cachedJWKS && now < cacheExpiresAt) return cachedJWKS;

  const response = await fetch(APPLE_JWKS_URL);
  if (!response.ok) throw new Error('Failed to fetch Apple JWKS');

  cachedJWKS = (await response.json()) as JWKS;
  cacheExpiresAt = now + 3_600_000; // 1 hour
  return cachedJWKS;
}

/**
 * Validates an Apple identity token and returns the stable user sub.
 * Throws if the token is invalid or expired.
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  bundleId: string,
): Promise<{ sub: string; email?: string }> {
  // Decode the header to find which key to use
  const header = decodeProtectedHeader(identityToken);
  if (!header.kid) throw new Error('Missing kid in Apple token header');

  const jwks = await getAppleJWKS();
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error(`Apple JWKS key not found: ${header.kid}`);

  const publicKey = await importJWK(jwk, 'RS256');

  const { payload } = await jwtVerify(identityToken, publicKey, {
    issuer: APPLE_ISSUER,
    audience: bundleId,
  });

  const claims = payload as unknown as AppleClaims;
  const result: { sub: string; email?: string } = { sub: claims.sub };
  if (claims.email) result.email = claims.email;
  return result;
}
