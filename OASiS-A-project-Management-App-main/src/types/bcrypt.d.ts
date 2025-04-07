declare module 'bcrypt' {
  /**
   * Generate a hash for the given string.
   */
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  
  /**
   * Compare a string to a hash to determine if the string matches the hash.
   */
  export function compare(data: string, encrypted: string): Promise<boolean>;
  
  /**
   * Generate a salt.
   */
  export function genSalt(rounds?: number): Promise<string>;
} 