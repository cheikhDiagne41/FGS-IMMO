import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterClientDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterClientDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LoginThrottleGuard)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('userId') userId: string) {
    return this.authService.me(userId);
  }
}
