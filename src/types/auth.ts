export interface LoginRequest {
  username: string;
  password: string;
  portal: 'tenant';
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface MeResponse {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
}

export interface LogoutResponse {
  message: string;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}
