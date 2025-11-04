/**
 * Sanitize user identifier (email or username) for logging
 */
export const sanitizeUserIdentifier = (identifier: string): string => {
  if (!identifier || typeof identifier !== 'string') return '[invalid-identifier]';

  // Check if it's an email (contains @)
  if (identifier.includes('@')) {
    const parts = identifier.split('@');
    if (parts.length !== 2) return '[malformed-email]';
    const [local, domain] = parts;
    if (!local || !domain) return '[malformed-email]';
    return `${local.substring(0, 2)}***@${domain}`;
  }

  // Handle username - mask middle characters
  if (identifier.length <= 2) return '***';
  if (identifier.length <= 4) return `${identifier[0]}***`;
  return `${identifier.substring(0, 2)}***${identifier.slice(-1)}`;
};

/**
 * Sanitize error for logging by limiting message length and extracting safe properties
 */
export const sanitizeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.substring(0, 100), // Limit message length
    };
  }
  return { error: 'Unknown error type' };
};
