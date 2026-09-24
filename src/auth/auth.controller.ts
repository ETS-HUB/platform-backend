import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  BoothRegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new student account' })
  @ApiResponse({
    status: 201,
    description: 'Student registered',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'student@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'STUDENT',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiJ9...',
        onboarding: {
          isFirstLogin: true,
          hasProfile: false,
          hasCompletedAssessment: false,
          nextStep: 'onboarding',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password (all roles)' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'demo@student.com',
          firstName: 'Alex',
          lastName: 'Johnson',
          role: 'STUDENT',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiJ9...',
        onboarding: {
          isFirstLogin: false,
          hasProfile: true,
          hasCompletedAssessment: true,
          nextStep: 'dashboard',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account deactivated',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('booth-register')
  @ApiOperation({
    summary:
      'Quick registration for booth/event mode (no password, student only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Booth registration successful',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'booth@student.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'STUDENT',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiJ9...',
        isExisting: false,
      },
    },
  })
  async boothRegister(@Body() dto: BoothRegisterDto) {
    return this.authService.boothRegister(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        message:
          'If an account exists with this email, a reset link has been sent.',
      },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({
    status: 200,
    schema: {
      example: { message: 'Password reset successfully. You can now login.' },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated user)' })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Password changed successfully' } },
  })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
