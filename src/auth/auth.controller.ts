import { Body, Controller, Post } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';
import { LoginDto, RegisterDto } from 'src/auth/dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto): Promise<User> {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto): Promise<any> {
    return this.authService.login(body, body);
  }
}
