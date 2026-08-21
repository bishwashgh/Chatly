export type AuthScreenName = 'home' | 'login' | 'register' | 'otp' | 'forgot';

export type PendingSignup = {
  username: string;
  email: string;
  password: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
};

export type OtpParams = {
  email: string;
  purpose: 'signup' | 'password_reset';
  pendingData?: PendingSignup;
};