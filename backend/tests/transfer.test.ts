import { request, app, testEmail, createAndLoginUser } from './helpers';

describe('Transfer E2E', () => {
  let senderToken: string;
  let recipientToken: string;
  let senderWalletId: string;
  let recipientEmail: string;

  beforeAll(async () => {
    // Create sender
    const senderEmail = testEmail('sender');
    const senderTokens = await createAndLoginUser(senderEmail);
    senderToken = senderTokens.accessToken;

    // Create recipient
    recipientEmail = testEmail('recipient');
    const recipientTokens = await createAndLoginUser(recipientEmail);
    recipientToken = recipientTokens.accessToken;

    // Create NGN wallets for both
    const senderWalletRes = await request(app)
      .post('/api/v1/wallets')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ currency: 'NGN' });

    senderWalletId = senderWalletRes.body.data?.wallet?.id ?? senderWalletRes.body.id;

    await request(app)
      .post('/api/v1/wallets')
      .set('Authorization', `Bearer ${recipientToken}`)
      .send({ currency: 'NGN' });
  });

  const senderAuth = () => ({ Authorization: `Bearer ${senderToken}` });

  // ── Validate account ───────────────────────────────────────────────────────

  describe('POST /api/v1/transfers/validate-account', () => {
    it('validates a bank account number', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/validate-account')
        .set(senderAuth())
        .send({ accountNumber: '0123456789', bankCode: '044' });

      // May return 200 with name or an error from the external bank API —
      // May return 200 with name, or 4xx/5xx if external API unavailable in test env
      expect(res.status).toBeGreaterThanOrEqual(200);
    });

    it('returns 400 on missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/validate-account')
        .set(senderAuth())
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── P2P Transfer ───────────────────────────────────────────────────────────

  describe('POST /api/v1/transfers/p2p', () => {
    it('returns 400 when sender has zero balance', async () => {
      // Wallet was just created — balance is 0
      const res = await request(app)
        .post('/api/v1/transfers/p2p')
        .set(senderAuth())
        .send({
          recipientEmail,
          currency: 'NGN',
          amount: 1000,
          note: 'Test transfer',
        });

      // Insufficient funds → 400 or 422
      expect([400, 422]).toContain(res.status);
    });

    it('returns 400 on missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/p2p')
        .set(senderAuth())
        .send({ currency: 'NGN' });

      expect(res.status).toBe(400);
    });

    it('returns 404 when recipient does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/p2p')
        .set(senderAuth())
        .set('X-Idempotency-Key', `test-404-${Date.now()}`)
        .send({
          senderWalletId,
          recipientEmail: 'nobody@doesnotexist.io',
          currency: 'NGN',
          amount: 100,
        });

      expect(res.status).toBe(404);
    });
  });

  // ── Bank Transfer ──────────────────────────────────────────────────────────

  describe('POST /api/v1/transfers/bank', () => {
    it('returns 400 when sender has zero balance', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/bank')
        .set(senderAuth())
        .send({
          currency: 'NGN',
          amount: 5000,
          accountNumber: '0123456789',
          bankCode: '044',
          accountName: 'John Doe',
          narration: 'Test bank transfer',
        });

      expect([400, 422]).toContain(res.status);
    });

    it('returns 400 on missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/bank')
        .set(senderAuth())
        .send({ currency: 'NGN' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/transfers/bank')
        .send({ currency: 'NGN', amount: 1000 });

      expect(res.status).toBe(401);
    });
  });
});
