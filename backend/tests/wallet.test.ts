import { request, app, testEmail, createAndLoginUser } from './helpers';

describe('Wallet E2E', () => {
  let accessToken: string;
  let walletId: string;
  const currency = 'NGN';

  beforeAll(async () => {
    const email = testEmail('wallet');
    const tokens = await createAndLoginUser(email);
    accessToken = tokens.accessToken;
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  // ── Create wallet ─────────────────────────────────────────────────────────

  describe('POST /api/v1/wallets', () => {
    it('creates a new wallet and returns 201', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .set(auth())
        .send({ currency });

      expect(res.status).toBe(201);
      expect(res.body.data.wallet).toMatchObject({
        currency,
        balance: expect.any(Number),
      });

      walletId = res.body.data.wallet.id;
    });

    it('returns 409 if wallet for currency already exists', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .set(auth())
        .send({ currency });

      expect(res.status).toBe(409);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/wallets')
        .send({ currency: 'USD' });

      expect(res.status).toBe(401);
    });
  });

  // ── List wallets ──────────────────────────────────────────────────────────

  describe('GET /api/v1/wallets', () => {
    it('returns array of wallets', async () => {
      const res = await request(app)
        .get('/api/v1/wallets')
        .set(auth());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.wallets)).toBe(true);
      expect(res.body.data.wallets.length).toBeGreaterThan(0);
    });
  });

  // ── Get wallet by id ──────────────────────────────────────────────────────

  describe('GET /api/v1/wallets/:id', () => {
    it('returns wallet detail', async () => {
      const res = await request(app)
        .get(`/api/v1/wallets/${walletId}`)
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.data.wallet).toMatchObject({ id: walletId, currency });
    });

    it('returns 404 for unknown wallet id', async () => {
      const res = await request(app)
        .get('/api/v1/wallets/00000000-0000-0000-0000-000000000000')
        .set(auth());

      expect(res.status).toBe(404);
    });
  });

  // ── Freeze / Unfreeze ─────────────────────────────────────────────────────

  describe('PATCH /api/v1/wallets/:id/freeze and /unfreeze', () => {
    it('freezes a wallet', async () => {
      const res = await request(app)
        .patch(`/api/v1/wallets/${walletId}/freeze`)
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.data.wallet).toMatchObject({ status: 'frozen' });
    });

    it('unfreezes a wallet', async () => {
      const res = await request(app)
        .patch(`/api/v1/wallets/${walletId}/unfreeze`)
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.data.wallet).toMatchObject({ status: 'active' });
    });
  });

  // ── Transaction history ───────────────────────────────────────────────────

  describe('GET /api/v1/wallets/:id/transactions', () => {
    it('returns paginated transactions', async () => {
      const res = await request(app)
        .get(`/api/v1/wallets/${walletId}/transactions`)
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        data: expect.any(Array),
        pagination: expect.objectContaining({ total: expect.any(Number) }),
      });
    });
  });
});
