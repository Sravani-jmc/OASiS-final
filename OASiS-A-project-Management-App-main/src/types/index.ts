// Extend the Prisma User type to include reset token fields
import { User } from '.prisma/client';

declare global {
  namespace PrismaJson {
    interface UserWithResetToken extends User {
      resetToken?: string | null;
      resetTokenExpiry?: Date | null;
    }
  }
}

export {}; 