import { RegisterUserDto, LoginDto, AuthResponseDto } from '../dtos/auth.dto';

export interface IAuthService {
  register(dto: RegisterUserDto): Promise<AuthResponseDto>;
  login(dto: LoginDto): Promise<AuthResponseDto>;
  getUserProfile(userId: string): Promise<any>;
  requestPasswordReset(email: string): Promise<{message: string}>;
  // resetPassword(token: string, newPassword: string): Promise<void>;
}
