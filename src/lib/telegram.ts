import { createHmac } from 'crypto';

export interface InitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    allows_write_to_pm?: boolean;
  };
  auth_date: number;
  hash: string;
}

export interface ChatMemberResponse {
  ok: boolean;
  result?: {
    status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
    user: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
  error_code?: number;
  description?: string;
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256
 * @param initData Raw initData string from Telegram WebApp
 * @param botToken Telegram bot token
 * @returns Parsed and validated InitData or null if invalid
 */
export function validateInitData(initData: string, botToken: string): InitData | null {
  try {
    // Parse the initData string into key-value pairs
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      return null;
    }

    // Remove hash from params for validation
    params.delete('hash');

    // Sort parameters alphabetically
    const sortedParams = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));

    // Create data string
    const dataString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');

    // Create secret key from bot token
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();

    // Calculate expected hash
    const expectedHash = createHmac('sha256', secretKey).update(dataString).digest('hex');

    // Compare hashes
    if (expectedHash !== hash) {
      return null;
    }

    // Parse and return the validated data
    const authDate = parseInt(params.get('auth_date') || '0');
    const userStr = params.get('user');

    let user = undefined;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        // Invalid user data
        return null;
      }
    }

    return {
      query_id: params.get('query_id') || undefined,
      user,
      auth_date: authDate,
      hash
    };
  } catch (error) {
    console.error('Error validating initData:', error);
    return null;
  }
}

/**
 * Calls Telegram Bot API to get chat member status
 * @param botToken Telegram bot token
 * @param chatId Chat/channel ID
 * @param userId User ID to check
 * @returns ChatMemberResponse from Telegram API
 */
export async function getChatMember(
  botToken: string,
  chatId: string | number,
  userId: number
): Promise<ChatMemberResponse> {
  const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${userId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: ChatMemberResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling Telegram API:', error);
    return {
      ok: false,
      error_code: 500,
      description: 'Internal server error'
    };
  }
}

/**
 * Checks if user is a member of the chat based on status
 * @param status Member status from Telegram API
 * @returns true if user is member, admin, or creator
 */
export function isChatMember(status: string): boolean {
  return ['creator', 'administrator', 'member'].includes(status);
}

/**
 * Extracts user ID from validated initData
 * @param initData Validated InitData object
 * @returns User ID or null if not available
 */
export function getUserIdFromInitData(initData: InitData): number | null {
  return initData.user?.id || null;
}
