/**
 * Test helpers — boots the Express app for the test suite.
 * Uses the real Neon DB with unique email prefixes for isolation.
 */
import request from 'supertest';

// Import app after env is loaded so all config resolves correctly
import app from '../src/app';
import { otpStore } from '../src/services/auth';

export { request, app };

/** Generate a unique test email */
export function testEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}@jetrpay-test.io`;
}

/**
 * Signup → retrieve OTP from in-memory store → verify → return tokens.
 * Works because the app shares process memory during tests.
 */
export async function createAndLoginUser(email: string, password = 'TestPass@123') {
  // Signup
  await request(app)
    .post('/api/v1/auth/signup')
    .send({ email, password, firstName: 'Test', lastName: 'User', phone: '+2348000000001' })
    .expect(201);

  // Read OTP directly from the in-memory store
  const entry = otpStore.get(email);
  if (!entry) throw new Error(`No OTP found for ${email}`);

  // Verify OTP and get tokens
  const res = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ email, otp: entry.code })
    .expect(200);

  return res.body.data as { accessToken: string; refreshToken: string };
}
