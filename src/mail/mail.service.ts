import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MailService {
  private logger = new Logger(MailService.name);
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM_EMAIL') ||
      'noreply@ets-platform.com';
    this.fromName =
      this.configService.get<string>('MAIL_FROM_NAME') || 'ETS Platform';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  private async sendEmail(
    to: string,
    toName: string,
    subject: string,
    htmlContent: string,
  ) {
    if (!this.apiKey || this.apiKey === 'your-brevo-api-key') {
      this.logger.warn(`Email skipped (no API key): ${subject} → ${to}`);
      return;
    }

    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { email: this.fromEmail, name: this.fromName },
          to: [{ email: to, name: toName }],
          subject,
          htmlContent,
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Email sent: ${subject} → ${to}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}: ${error?.response?.data?.message || error.message}`,
      );
      throw error;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetToken: string,
  ) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    await this.sendEmail(
      to,
      firstName,
      'Reset Your Password - ETS Platform',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>You requested a password reset for your ETS Platform account.</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">If you didn't request this, safely ignore this email.</p>
        <p style="color: #666; font-size: 12px;">Link: ${resetUrl}</p>
      </div>
    `,
    );
  }

  async sendWelcomeEmail(to: string, firstName: string) {
    const loginUrl = `${this.frontendUrl}/login`;

    await this.sendEmail(
      to,
      firstName,
      'Welcome to ETS Platform',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ETS Platform!</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been created successfully.</p>
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Get Started
        </a>
        <p style="color: #666; font-size: 14px;">Take your skill assessment to unlock personalized learning recommendations.</p>
      </div>
    `,
    );
  }

  async sendAccountCreatedByAdminEmail(
    to: string,
    firstName: string,
    role: string,
    tempPassword: string,
  ) {
    const loginUrl = `${this.frontendUrl}/login`;

    await this.sendEmail(
      to,
      firstName,
      `Your ${role} Account - ETS Platform`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your ETS Platform Account</h2>
        <p>Hi ${firstName},</p>
        <p>An account has been created for you with the role: <strong>${role}</strong>.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;">Email: <strong>${to}</strong></p>
          <p style="margin: 4px 0;">Password: <strong>${tempPassword}</strong></p>
        </div>
        <p style="color: #e11d48;">Please change your password after your first login.</p>
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Login Now
        </a>
      </div>
    `,
    );
  }

  async sendBoothResultsEmail(
    to: string,
    firstName: string,
    score: number,
    profileUrl: string,
  ) {
    await this.sendEmail(
      to,
      firstName,
      'Your Skill Assessment Results - ETS Platform',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Assessment Results</h2>
        <p>Hi ${firstName},</p>
        <p>Thanks for taking the ETS Skill Assessment!</p>
        <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <p style="font-size: 48px; font-weight: bold; margin: 0; color: #4F46E5;">${score}%</p>
          <p style="color: #666; margin: 8px 0 0 0;">Overall Score</p>
        </div>
        <p>View your full profile with AI-powered insights and personalized learning path:</p>
        <a href="${profileUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Full Results
        </a>
        <p style="color: #666; font-size: 14px;">Set a password to access your account anytime and track your progress.</p>
      </div>
    `,
    );
  }
}
