import { Router, Request, Response } from 'express';
import {
  signup,
  login,
  verifyOTP,
  refreshToken,
  resendOTP,
  getCurrentUser,
  logout
} from '@/controllers/auth';
import { authenticate, rateLimit } from '@/middleware/auth';

const router: Router = Router();

/**
 * POST /api/v1/auth/signup
 * Create new user account
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "password": "SecurePass123!@#",
 *   "phone": "+1234567890" // optional
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "uuid",
 *     "email": "user@example.com",
 *     "message": "Signup successful. Check your email for OTP.",
 *     "otpSent": true,
 *     "otpExpiresIn": 600
 *   }
 * }
 */
router.post('/signup', rateLimit(5, 15 * 60 * 1000), signup);

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and confirm email
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456",
 *   "deviceName": "iPhone 15"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "uuid",
 *     "accessToken": "jwt_token",
 *     "refreshToken": "jwt_refresh_token",
 *     "user": { user object },
 *     "message": "Email verified successfully. Welcome!"
 *   }
 * }
 */
router.post('/verify-otp', rateLimit(10, 15 * 60 * 1000), verifyOTP);

/**
 * POST /api/v1/auth/login
 * Authenticate user with email and password
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!@#",
 *   "deviceName": "Web Browser"
 * }
 *
 * Response (if email verified):
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "uuid",
 *     "accessToken": "jwt_token",
 *     "refreshToken": "jwt_refresh_token",
 *     "message": "Login successful"
 *   }
 * }
 *
 * Response (if email not verified):
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "uuid",
 *     "requiresOTP": true,
 *     "otpExpiresIn": 600,
 *     "message": "Email verification required..."
 *   }
 * }
 */
router.post('/login', rateLimit(10, 15 * 60 * 1000), login);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "jwt_refresh_token"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "accessToken": "new_jwt_token",
 *     "refreshToken": "new_jwt_refresh_token"
 *   }
 * }
 */
router.post('/refresh', refreshToken);

/**
 * POST /api/v1/auth/resend-otp
 * Resend OTP to email
 *
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "message": "OTP sent successfully. Check your email.",
 *     "otpExpiresIn": 600
 *   }
 * }
 */
router.post('/resend-otp', rateLimit(3, 15 * 60 * 1000), resendOTP);

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 *
 * Headers: Authorization: Bearer <access_token>
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "uuid",
 *     "email": "user@example.com",
 *     "role": "user"
 *   }
 * }
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * POST /api/v1/auth/logout
 * Logout current user
 *
 * Headers: Authorization: Bearer <access_token>
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Logged out successfully"
 *   }
 * }
 */
router.post('/logout', authenticate, logout);

export default router;
