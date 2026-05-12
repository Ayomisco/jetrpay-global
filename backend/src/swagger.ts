import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JetRPay API',
      version: '1.0.0',
      description: 'Fintech payment infrastructure — wallets, P2P transfers, bank transfers, KYC',
      contact: {
        name: 'JetRPay Engineering',
        email: 'engineering@jetrpay.io'
      }
    },
    servers: [
      { url: '/api/v1', description: 'API v1' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // ── Auth ──────────────────────────────────────────────
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'phoneNumber'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            password: { type: 'string', minLength: 8, example: 'Secure@123' },
            firstName: { type: 'string', example: 'Alice' },
            lastName: { type: 'string', example: 'Johnson' },
            phoneNumber: { type: 'string', example: '+2348012345678' }
          }
        },
        VerifyOtpRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: { type: 'string', format: 'email' },
            otp: { type: 'string', example: '123456' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' }
          }
        },
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number', example: 604800 }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            role: { type: 'string', enum: ['user', 'merchant', 'admin'] },
            status: { type: 'string', enum: ['pending', 'active', 'suspended', 'banned'] },
            kycStatus: { type: 'string', enum: ['not_started', 'pending', 'approved', 'rejected'] },
            kycTier: { type: 'string', enum: ['tier_0', 'tier_1', 'tier_2', 'tier_3'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ── Wallets ───────────────────────────────────────────
        CreateWalletRequest: {
          type: 'object',
          required: ['currency'],
          properties: {
            currency: { type: 'string', enum: ['USD', 'NGN', 'GBP', 'EUR', 'XOF'], example: 'NGN' }
          }
        },
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            currency: { type: 'string', example: 'NGN' },
            balance: { type: 'number', example: 10000.00 },
            availableBalance: { type: 'number', example: 10000.00 },
            reservedBalance: { type: 'number', example: 0.00 },
            status: { type: 'string', enum: ['active', 'frozen'] },
            accountNumber: { type: 'string', nullable: true },
            accountName: { type: 'string', nullable: true },
            bankCode: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        // ── Transfers ─────────────────────────────────────────
        P2PTransferRequest: {
          type: 'object',
          required: ['senderWalletId', 'recipientTag', 'amount', 'currency'],
          properties: {
            senderWalletId: { type: 'string', format: 'uuid' },
            recipientTag: { type: 'string', example: 'alice@jetrpay' },
            amount: { type: 'number', minimum: 0.01, example: 500.00 },
            currency: { type: 'string', example: 'NGN' },
            note: { type: 'string', example: 'Dinner split', maxLength: 255 },
            idempotencyKey: { type: 'string', example: 'txn-abc123' }
          }
        },
        BankTransferRequest: {
          type: 'object',
          required: ['walletId', 'recipientAccountNumber', 'recipientBankCode', 'recipientAccountName', 'amount', 'currency'],
          properties: {
            walletId: { type: 'string', format: 'uuid' },
            recipientAccountNumber: { type: 'string', example: '0123456789' },
            recipientBankCode: { type: 'string', example: '044' },
            recipientAccountName: { type: 'string', example: 'Bob Smith' },
            amount: { type: 'number', minimum: 1, example: 5000.00 },
            currency: { type: 'string', example: 'NGN' },
            narration: { type: 'string', example: 'Payment for goods' },
            idempotencyKey: { type: 'string' }
          }
        },
        TransferResult: {
          type: 'object',
          properties: {
            reference: { type: 'string' },
            transactionId: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['completed', 'pending', 'failed'] },
            fees: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            walletId: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: [
                'p2p_send', 'p2p_receive', 'bank_transfer_send', 'bank_transfer_receive',
                'card_issuance', 'card_funding', 'card_withdrawal', 'atm_withdrawal',
                'fee', 'reversal'
              ]
            },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'reversed'] },
            description: { type: 'string', nullable: true },
            reference: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        PaginatedTransactions: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { '$ref': '#/components/schemas/Transaction' } },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                pageSize: { type: 'number' },
                totalPages: { type: 'number' }
              }
            }
          }
        },
        // ── Common ────────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Unauthorized' },
            message: { type: 'string', example: 'Invalid or expired token' },
            code: { type: 'string', example: 'UNAUTHORIZED' }
          }
        },
        SuccessMessage: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation successful' }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid auth token',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } }
        },
        NotFound: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } }
        },
        BadRequest: {
          description: 'Validation error',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } }
        },
        Conflict: {
          description: 'Resource already exists',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } }
        },
        UnprocessableEntity: {
          description: 'Business rule violation (e.g. insufficient funds)',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErrorResponse' } } }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication — signup, OTP, login, token refresh' },
      { name: 'Wallets', description: 'Wallet management and transaction history' },
      { name: 'Transfers', description: 'P2P and bank transfers' }
    ],
    paths: {
      // ── Auth endpoints ────────────────────────────────────
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Create account',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/SignupRequest' } } } },
          responses: {
            201: {
              description: 'Account created — OTP sent to email',
              content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, userId: { type: 'string' } } } } }
            },
            409: { '$ref': '#/components/responses/Conflict' },
            400: { '$ref': '#/components/responses/BadRequest' }
          }
        }
      },
      '/auth/verify-otp': {
        post: {
          tags: ['Auth'],
          summary: 'Verify email OTP and activate account',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/VerifyOtpRequest' } } } },
          responses: {
            200: {
              description: 'Account verified — returns token pair',
              content: { 'application/json': { schema: { allOf: [{ '$ref': '#/components/schemas/TokenPair' }, { type: 'object', properties: { user: { '$ref': '#/components/schemas/UserProfile' } } }] } } }
            },
            400: { '$ref': '#/components/responses/BadRequest' }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email + password',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: {
              description: 'Login successful',
              content: { 'application/json': { schema: { allOf: [{ '$ref': '#/components/schemas/TokenPair' }, { type: 'object', properties: { user: { '$ref': '#/components/schemas/UserProfile' } } }] } } }
            },
            401: { '$ref': '#/components/responses/Unauthorized' }
          }
        }
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/RefreshTokenRequest' } } } },
          responses: {
            200: { description: 'New token pair', content: { 'application/json': { schema: { '$ref': '#/components/schemas/TokenPair' } } } },
            401: { '$ref': '#/components/responses/Unauthorized' }
          }
        }
      },
      '/auth/resend-otp': {
        post: {
          tags: ['Auth'],
          summary: 'Resend OTP to email',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
          responses: {
            200: { description: 'OTP sent', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } },
            404: { '$ref': '#/components/responses/NotFound' }
          }
        }
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current user', content: { 'application/json': { schema: { '$ref': '#/components/schemas/UserProfile' } } } },
            401: { '$ref': '#/components/responses/Unauthorized' }
          }
        }
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout (invalidate session)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Logged out', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } },
            401: { '$ref': '#/components/responses/Unauthorized' }
          }
        }
      },
      // ── Wallet endpoints ──────────────────────────────────
      '/wallets': {
        get: {
          tags: ['Wallets'],
          summary: 'List all wallets for authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Wallet list', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Wallet' } } } } },
            401: { '$ref': '#/components/responses/Unauthorized' }
          }
        },
        post: {
          tags: ['Wallets'],
          summary: 'Create a new wallet',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateWalletRequest' } } } },
          responses: {
            201: { description: 'Wallet created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Wallet' } } } },
            409: { '$ref': '#/components/responses/Conflict' },
            401: { '$ref': '#/components/responses/Unauthorized' }
          }
        }
      },
      '/wallets/{walletId}': {
        get: {
          tags: ['Wallets'],
          summary: 'Get wallet by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'walletId', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Wallet details', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Wallet' } } } },
            404: { '$ref': '#/components/responses/NotFound' },
            401: { '$ref': '#/components/responses/Unauthorized' }
          }
        }
      },
      '/wallets/{walletId}/freeze': {
        patch: {
          tags: ['Wallets'],
          summary: 'Freeze a wallet',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'walletId', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Wallet frozen', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Wallet' } } } },
            404: { '$ref': '#/components/responses/NotFound' }
          }
        }
      },
      '/wallets/{walletId}/unfreeze': {
        patch: {
          tags: ['Wallets'],
          summary: 'Unfreeze a wallet',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'walletId', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Wallet unfrozen', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Wallet' } } } },
            404: { '$ref': '#/components/responses/NotFound' }
          }
        }
      },
      '/wallets/{walletId}/transactions': {
        get: {
          tags: ['Wallets'],
          summary: 'Get transaction history for a wallet',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'walletId', required: true, schema: { type: 'string', format: 'uuid' } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20, maximum: 100 } },
            { in: 'query', name: 'type', schema: { type: 'string' }, description: 'Filter by transaction type' },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'reversed'] } }
          ],
          responses: {
            200: { description: 'Paginated transactions', content: { 'application/json': { schema: { '$ref': '#/components/schemas/PaginatedTransactions' } } } },
            404: { '$ref': '#/components/responses/NotFound' }
          }
        }
      },
      '/wallets/{walletId}/transactions/{transactionId}': {
        get: {
          tags: ['Wallets'],
          summary: 'Get a single transaction',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'walletId', required: true, schema: { type: 'string', format: 'uuid' } },
            { in: 'path', name: 'transactionId', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            200: { description: 'Transaction details', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Transaction' } } } },
            404: { '$ref': '#/components/responses/NotFound' }
          }
        }
      },
      // ── Transfer endpoints ────────────────────────────────
      '/transfers/p2p': {
        post: {
          tags: ['Transfers'],
          summary: 'Send P2P transfer to another JetRPay user',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/P2PTransferRequest' } } } },
          responses: {
            200: { description: 'Transfer completed', content: { 'application/json': { schema: { '$ref': '#/components/schemas/TransferResult' } } } },
            422: { '$ref': '#/components/responses/UnprocessableEntity' },
            404: { '$ref': '#/components/responses/NotFound' }
          }
        }
      },
      '/transfers/bank': {
        post: {
          tags: ['Transfers'],
          summary: 'Send money to a bank account',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/BankTransferRequest' } } } },
          responses: {
            200: { description: 'Transfer initiated', content: { 'application/json': { schema: { '$ref': '#/components/schemas/TransferResult' } } } },
            422: { '$ref': '#/components/responses/UnprocessableEntity' },
            400: { '$ref': '#/components/responses/BadRequest' }
          }
        }
      },
      '/transfers/validate-account': {
        post: {
          tags: ['Transfers'],
          summary: 'Validate a bank account number',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['accountNumber', 'bankCode'],
                  properties: {
                    accountNumber: { type: 'string', example: '0123456789' },
                    bankCode: { type: 'string', example: '044' }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Account details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accountNumber: { type: 'string' },
                      accountName: { type: 'string' },
                      bankCode: { type: 'string' }
                    }
                  }
                }
              }
            },
            404: { '$ref': '#/components/responses/NotFound' }
          }
        }
      }
    }
  },
  apis: [] // All paths defined inline above
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Application): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'JetRPay API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true
    }
  }));

  // Also expose the raw JSON spec
  app.get('/api/docs.json', (_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  });
}
