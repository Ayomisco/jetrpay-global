import { request, app, testEmail, createAndLoginUser } from './helpers';
import { otpStore } from '../src/services/auth';

describe('Auth E2E', () => {
  const password = 'TestPass@123';

  // ── Signup ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/signup', () => {
    it('creates a new user and returns 201', async () => {
      const email = testEmail('signup');
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, firstName: 'Alice', lastName: 'Test', phoneNumber: '+2348011111111' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ message: expect.any(String), otpSent: expect.any(Boolean) });
    });

    it('returns 409 when email is already registered', async () => {
      const email = testEmail('dup');
      await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, firstName: 'Alice', lastName: 'Test', phoneNumber: '+2348011111112' });

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, firstName: 'Alice', lastName: 'Test', phoneNumber: '+2348011111113' });

      expect(res.status).toBe(409);
    });

    it('returns 400 on missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ email: 'notvalid', password: '123' });

      expect(res.status).toBe(400);
    });
  });

  // ── Verify OTP ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/verify-otp', () => {
    it('verifies OTP and returns access + refresh tokens', async () => {
      const email = testEmail('otp');
      await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, firstName: 'Bob', lastName: 'Test', phoneNumber: '+2348022222221' })
        .expect(201);

      const entry = otpStore.get(email);
      expect(entry).toBeDefined();

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otp: entry!.code });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('returns 400 on wrong OTP', async () => {
      const email = testEmail('wrongotp');
      await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, firstName: 'Carol', lastName: 'Test', phoneNumber: '+2348033333331' })
        .expect(201);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, otp: '000000' });

      expect(res.status).toBe(400);
    });
  });

  // ── Login ────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('returns tokens for verified user', async () => {
      const email = testEmail('login');
      await createAndLoginUser(email, password);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('returns 401 on wrong password', async () => {
      const email = testEmail('loginbad');
      await createAndLoginUser(email, password);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass@999' });

      expect(res.status).toBe(401);
    });

    it('returns 202 with requiresOTP for unverified user', async () => {
      const email = testEmail('unverified');
      await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, firstName: 'Dave', lastName: 'Test', phone: '+2348044444441' })
        .expect(201);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });

      expect(res.status).toBe(202);
      expect(res.body.data.requiresOTP).toBe(true);
    });
  });

  // ── Get current user ─────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('returns user profile with valid token', async () => {
      const email = testEmail('me');
      const { accessToken } = await createAndLoginUser(email, password);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ email });
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── Refresh token ────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('returns new access token', async () => {
      const email = testEmail('refresh');
      const { refreshToken } = await createAndLoginUser(email, password);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ accessToken: expect.any(String) });
    });

    it('returns 401 with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'bad.token.here' });

      expect(res.status).toBe(401);
    });
  });

  // ── Logout ───────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 and invalidates session', async () => {
      const email = testEmail('logout');
      const { accessToken, refreshToken } = await createAndLoginUser(email, password);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
    });
  });

  // ── Resend OTP ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/resend-otp', () => {
    it('resends OTP for existing unverified user', async () => {
      const email = testEmail('resend');
      await request(app)
        .post('/api/v1/auth/signup')
        .send({ email, password, firstName: 'Eve', lastName: 'Test', phoneNumber: '+2348055555551' })
        .expect(201);

      const res = await request(app)
        .post('/api/v1/auth/resend-otp')
        .send({ email });

      expect(res.status).toBe(200);
    });
  });
});
