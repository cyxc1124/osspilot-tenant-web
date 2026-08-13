const REMEMBER_KEY = 'osspilot_tenant_remember';
const TOKEN_KEY = 'osspilot_tenant_token';

export function isRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}

export function setRememberMe(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, String(remember));
}

function activeStorage(): Storage {
  return isRememberMe() ? localStorage : sessionStorage;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (token) {
    activeStorage().setItem(TOKEN_KEY, token);
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
