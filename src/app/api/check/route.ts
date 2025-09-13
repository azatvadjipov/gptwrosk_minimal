import { NextRequest, NextResponse } from 'next/server';
import { validateInitData, getChatMember, getUserIdFromInitData, isChatMember } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();

    if (!initData || typeof initData !== 'string') {
      return NextResponse.json(
        { error: 'Invalid initData' },
        { status: 400 }
      );
    }

    // Get environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      console.error('Missing environment variables: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate initData
    const validatedData = validateInitData(initData, botToken);
    if (!validatedData) {
      return NextResponse.json(
        { error: 'Invalid initData signature' },
        { status: 401 }
      );
    }

    // Check if initData is not too old (max 24 hours)
    const now = Math.floor(Date.now() / 1000);
    const authDate = validatedData.auth_date;
    const maxAge = 24 * 60 * 60; // 24 hours in seconds

    if (now - authDate > maxAge) {
      return NextResponse.json(
        { error: 'initData expired' },
        { status: 401 }
      );
    }

    // Extract user ID
    const userId = getUserIdFromInitData(validatedData);
    if (!userId) {
      return NextResponse.json(
        { error: 'No user ID in initData' },
        { status: 400 }
      );
    }

    // Call Telegram Bot API to check membership
    const chatMemberResponse = await getChatMember(botToken, channelId, userId);

    if (!chatMemberResponse.ok) {
      console.error('Telegram API error:', chatMemberResponse.description);
      return NextResponse.json(
        { error: 'Failed to check membership' },
        { status: 500 }
      );
    }

    // Check membership status
    const isMember = chatMemberResponse.result
      ? isChatMember(chatMemberResponse.result.status)
      : false;

    return NextResponse.json({ member: isMember });

  } catch (error) {
    console.error('Error in /api/check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
