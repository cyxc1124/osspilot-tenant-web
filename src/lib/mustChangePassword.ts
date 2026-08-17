export function mustChangePassword(user: { must_change_password?: boolean } | null | undefined): boolean {
  return user?.must_change_password === true;
}
