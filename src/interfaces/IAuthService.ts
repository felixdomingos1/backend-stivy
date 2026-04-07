import { RegisterUserDto, LoginDto, AuthResponseDto } from '../dtos/auth.dto';

export interface IAuthService {
  register(dto: RegisterUserDto): Promise<AuthResponseDto>;
  login(dto: LoginDto): Promise<AuthResponseDto>;
  getUserProfile(userId: number): Promise<any>;
  requestPasswordReset(email: string): Promise<string>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
