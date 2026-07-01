import { AuthService } from '../../../services/auth.service';
import { UserRepository } from '../../../repositories/user.repository';
import { FazedorRepository } from '../../../repositories/fazedor.repository';
import { hashSenha, compararSenha } from '../../../utils/bcrypt';
import { gerarToken, generateRefreshToken } from '../../../utils/jwt';
import { EmailService } from '../../../services/email.service';
import { OTPService } from '../../../services/otp.service';
import { ValidationError, AuthenticationError, AuthorizationError } from '../../../utils/errors';
import { buildTestUser, buildTestFazedor } from '../../helpers';

jest.mock('../../../utils/bcrypt');
jest.mock('../../../utils/jwt');
jest.mock('../../../services/email.service');
jest.mock('../../../services/otp.service');
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const MockedHashSenha = jest.mocked(hashSenha);
const MockedCompararSenha = jest.mocked(compararSenha);
const MockedGerarToken = jest.mocked(gerarToken);
const MockedGenerateRefreshToken = jest.mocked(generateRefreshToken);

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let fazedorRepository: jest.Mocked<FazedorRepository>;
  let emailService: jest.Mocked<EmailService>;
  let otpService: jest.Mocked<OTPService>;

  const mockUser = buildTestUser({
    email_verificado: false,
    email_verification_code: '123456',
    email_verification_expira: new Date(Date.now() + 900000),
    verification_attempts: 0,
  });

  const mockVerifiedUser = buildTestUser({
    email_verificado: true,
    email_verification_code: null,
    email_verification_expira: null,
    verification_attempts: 0,
  });

  const mockFazedor = buildTestFazedor();

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByIdComplete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateLastAccess: jest.fn(),
      updatePassword: jest.fn(),
      updatePasswordResetToken: jest.fn(),
      incrementVerificationAttempts: jest.fn(),
      markEmailAsVerified: jest.fn(),
      updateVerificationCode: jest.fn(),
      updateUser: jest.fn(),
      addFavorito: jest.fn(),
      removeFavorito: jest.fn(),
      listFavoritos: jest.fn(),
      isFavorito: jest.fn(),
      updateFotoPerfil: jest.fn(),
      updatePasswordResetOTP: jest.fn(),
      findByPasswordResetOTP: jest.fn(),
      incrementResetPasswordAttempts: jest.fn(),
      clearPasswordResetOTP: jest.fn(),
      findAll: jest.fn(),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      isFollowing: jest.fn(),
      getSeguidores: jest.fn(),
      getSeguindo: jest.fn(),
      countSeguidores: jest.fn(),
      countSeguindo: jest.fn(),
    } as any;

    fazedorRepository = {
      findFazedorByUserId: jest.fn(),
      findFazedorWithDetails: jest.fn(),
      createFazedor: jest.fn(),
      findById: jest.fn(),
      findAgenciaByFazedorId: jest.fn(),
      findFazedorById: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findByTipo: jest.fn(),
      findByAvaliacao: jest.fn(),
      findPendentes: jest.fn(),
      aprovarFazedor: jest.fn(),
      rejeitarFazedor: jest.fn(),
      updateAvaliacaoMedia: jest.fn(),
      findByProximidade: jest.fn(),
      getEstatisticasGerais: jest.fn(),
    } as any;

    emailService = {
      sendVerificationEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetOTPEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendEmail: jest.fn(),
    } as any;

    otpService = {
      generateOTP: jest.fn().mockReturnValue('123456'),
      isOTPValid: jest.fn(),
      getExpirationDate: jest.fn().mockReturnValue(new Date(Date.now() + 900000)),
      generateVerificationCode: jest.fn(),
    } as any;

    (EmailService.getInstance as jest.Mock).mockReturnValue(emailService);
    (OTPService.getInstance as jest.Mock).mockReturnValue(otpService);

    authService = new AuthService(userRepository, fazedorRepository);

    MockedGerarToken.mockReturnValue('mocked-jwt-token');
    MockedGenerateRefreshToken.mockResolvedValue('mocked-refresh-token');
    MockedHashSenha.mockResolvedValue('$2a$10$hashedpassword');
    MockedCompararSenha.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = { email: 'test@stivy.com', senha: 'correct_password' };

    it('should login with valid credentials', async () => {
      userRepository.findByEmail.mockResolvedValue(mockVerifiedUser as any);
      fazedorRepository.findFazedorByUserId.mockResolvedValue(null);

      const result = await authService.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.token).toBe('mocked-jwt-token');
      expect(result.refreshToken).toBe('mocked-refresh-token');
      expect(result.usuario.email).toBe('test@stivy.com');
      expect(userRepository.updateLastAccess).toHaveBeenCalledWith(mockVerifiedUser.id_usuario);
    });

    it('should throw AuthenticationError when user is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(AuthenticationError);
      await expect(authService.login(loginDto)).rejects.toThrow('Email ou senha inválidos');
    });

    it('should throw AuthenticationError when password is wrong', async () => {
      userRepository.findByEmail.mockResolvedValue(mockVerifiedUser as any);
      MockedCompararSenha.mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(AuthenticationError);
      await expect(authService.login(loginDto)).rejects.toThrow('Email ou senha inválidos');
    });

    it('should throw AuthenticationError when user is inactive', async () => {
      userRepository.findByEmail.mockResolvedValue(
        buildTestUser({ status: 'bloqueado', email_verificado: true }) as any
      );

      await expect(authService.login(loginDto)).rejects.toThrow('Usuário bloqueado ou inativo');
    });

    it('should include fazedor data when user is a fazedor', async () => {
      const userFazedor = buildTestUser({
        tipo: 'fazedor',
        email_verificado: true,
      });
      userRepository.findByEmail.mockResolvedValue(userFazedor as any);
      fazedorRepository.findFazedorByUserId.mockResolvedValue(mockFazedor as any);

      const result = await authService.login(loginDto);

      expect(result.usuario.tipo_fazedor).toBe('maquiador');
      expect(result.usuario.status_aprovacao).toBe('aprovado');
    });
  });

  describe('register', () => {
    const registerDto = {
      nome: 'New User',
      email: 'new@stivy.com',
      senha: 'StrongPass123',
      telefone: '+244911111111',
      tipo: 'apreciador' as const,
    };

    it('should register a new user successfully', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser as any);

      const result = await authService.register(registerDto);

      expect(result.success).toBe(true);
      expect(result.requiresVerification).toBe(true);
      expect(result.usuario.email).toBe('test@stivy.com');
      expect(userRepository.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ValidationError if email is already registered', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(authService.register(registerDto)).rejects.toThrow(ValidationError);
      await expect(authService.register(registerDto)).rejects.toThrow('Email já cadastrado');
    });

    it('should create a fazedor record for fazedor users', async () => {
      const fazedorDto = {
        ...registerDto,
        tipo: 'fazedor' as const,
        tipo_fazedor: 'maquiador' as const,
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(buildTestUser({ tipo: 'fazedor' }) as any);
      fazedorRepository.createFazedor.mockResolvedValue(mockFazedor as any);

      await authService.register(fazedorDto);

      expect(fazedorRepository.createFazedor).toHaveBeenCalledWith({
        id_usuario: expect.any(String),
        tipo_fazedor: 'maquiador',
      });
    });

    it('should throw AuthorizationError if fazedor type is missing for fazedor users', async () => {
      const fazedorDto = {
        ...registerDto,
        tipo: 'fazedor' as const,
        tipo_fazedor: undefined,
      };

      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.register(fazedorDto)).rejects.toThrow(AuthorizationError);
      await expect(authService.register(fazedorDto)).rejects.toThrow('Precisas enviar o tipo de fazedor');
    });
  });

  describe('verifyEmail', () => {
    const verifyDto = { userId: mockUser.id_usuario, codigo: '123456' };

    it('should verify email with valid code', async () => {
      userRepository.findById.mockResolvedValue(mockUser as any);
      otpService.isOTPValid.mockReturnValue(true);
      userRepository.markEmailAsVerified.mockResolvedValue();
      fazedorRepository.findFazedorByUserId.mockResolvedValue(null);

      const result = await authService.verifyEmail(verifyDto);

      expect(result.success).toBe(true);
      expect(result.usuario.email_verificado).toBe(true);
      expect(userRepository.markEmailAsVerified).toHaveBeenCalledWith(mockUser.id_usuario);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should throw ValidationError if user is not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.verifyEmail(verifyDto)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if email is already verified', async () => {
      userRepository.findById.mockResolvedValue(mockVerifiedUser as any);

      await expect(authService.verifyEmail(verifyDto)).rejects.toThrow(ValidationError);
      await expect(authService.verifyEmail(verifyDto)).rejects.toThrow('Email já verificado');
    });

    it('should throw ValidationError if code is invalid', async () => {
      userRepository.findById.mockResolvedValue(mockUser as any);
      otpService.isOTPValid.mockReturnValue(false);

      await expect(authService.verifyEmail(verifyDto)).rejects.toThrow(ValidationError);
      await expect(authService.verifyEmail(verifyDto)).rejects.toThrow(/Código inválido/);
      expect(userRepository.incrementVerificationAttempts).toHaveBeenCalled();
    });

    it('should throw ValidationError if max attempts exceeded', async () => {
      const userWithMaxAttempts = buildTestUser({
        verification_attempts: 5,
      });
      userRepository.findById.mockResolvedValue(userWithMaxAttempts as any);

      await expect(authService.verifyEmail(verifyDto)).rejects.toThrow(ValidationError);
      await expect(authService.verifyEmail(verifyDto)).rejects.toThrow(
        'Número máximo de tentativas excedido. Solicite um novo código.'
      );
    });
  });
});
