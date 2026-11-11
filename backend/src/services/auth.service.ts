import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '../types/index.js';
import prisma from '../db/prisma.js';
import { env } from '../config/env.js';
import { AppError, UnauthorizedError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import { AccountService } from './account.service.js';

export interface RegisterUserParams {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
  initialDeposit?: number;
  ipAddress?: string;
}

export class AuthService {
  /**
   * Register a new user (Enforces FR-1, FR-3, SR-7)
   * Automatically provisions a default primary checking account with initial onboarding
   */
  static async register(params: RegisterUserParams) {
    const emailNormalized = params.email.trim().toLowerCase();

    // Check duplicate user (SR-7: Generic error message during public flows if desired, but for registration duplicate email response is standard)
    const existing = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existing) {
      throw new AppError('A user with this email address already exists.', 409, 'USER_EXISTS');
    }

    // Hash password with bcrypt (minimum 10 salt rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);

    // Default role is ACCOUNT_HOLDER unless explicitly registered by admin
    const role: Role = params.role || 'ACCOUNT_HOLDER';

    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        passwordHash,
        fullName: params.fullName.trim(),
        role,
      },
    });

    // Automatically create primary checking account for Account Holders (FR-3 Onboarding)
    let primaryAccount = null;
    if (role === 'ACCOUNT_HOLDER') {
      primaryAccount = await AccountService.createAccount({
        userId: user.id,
        currency: 'USD',
        initialDeposit: params.initialDeposit || 0,
        actor: {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          ip: params.ipAddress,
        },
      });
    }

    // Log onboarding event to audit trail (FR-10)
    await AuditService.log({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role as Role,
      action: 'AUTH_REGISTER',
      targetType: 'USER',
      targetId: user.id,
      outcome: 'SUCCESS',
      details: {
        email: user.email,
        role: user.role,
        primaryAccountId: primaryAccount?.id,
      },
      ipAddress: params.ipAddress,
    });

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      fullName: user.fullName,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
      },
      account: primaryAccount,
      token,
    };
  }

  /**
   * Authenticate user with email and password
   * Hardened against user enumeration (SR-7)
   */
  static async login(email: string, password: string, ipAddress?: string) {
    const emailNormalized = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    // Enforce SR-7: Constant-time comparison simulation to prevent enumeration and timing attacks
    if (!user) {
      // Fake bcrypt comparison to match timing
      await bcrypt.compare(password, '$2a$10$wT8KzU4/8g7mHkQ37b8zGeT/qYV0r6UqLp0r8z5s6KqT9w7u8e0v2');
      
      await AuditService.log({
        actorEmail: emailNormalized,
        actorRole: 'ACCOUNT_HOLDER',
        action: 'AUTH_LOGIN_FAILED',
        targetType: 'USER',
        outcome: 'FAILURE',
        details: { reason: 'Invalid credentials or user not found' },
        ipAddress,
      });

      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await AuditService.log({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role as Role,
        action: 'AUTH_LOGIN_FAILED',
        targetType: 'USER',
        targetId: user.id,
        outcome: 'FAILURE',
        details: { reason: 'Invalid password' },
        ipAddress,
      });

      throw new UnauthorizedError('Invalid email or password.');
    }

    // Log successful login
    await AuditService.log({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role as Role,
      action: 'AUTH_LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      outcome: 'SUCCESS',
      ipAddress,
    });

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      fullName: user.fullName,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as Role,
      },
      token,
    };
  }

  /**
   * Helper to sign JWT authentication token
   */
  static generateToken(payload: { id: string; email: string; role: Role; fullName: string }): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }
}

