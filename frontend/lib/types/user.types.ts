export interface User {
  id: string;
  name: string | null;
  email: string;
  isVerified: boolean;
  lastLoginAt: Date;
}
