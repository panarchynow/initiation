import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Внешний сервис MMWB для обработки SEP-0007 URIs
// Именно этот URL указан в документации
const EXTERNAL_MMWB_SERVICE_URL = "https://eurmtl.me/remote/sep07/add";

/**
 * API эндпоинт для отправки Stellar URI на внешний сервис MMWB
 * и получения ссылки на Telegram бота
 */
export async function POST(request: NextRequest) {
  try {
    // Извлекаем SEP-0007 URI из тела запроса
    const { stellarUri } = await request.json();
    
    if (!stellarUri || !stellarUri.startsWith('web+stellar:')) {
      return NextResponse.json(
        { error: 'Invalid Stellar URI format' },
        { status: 400 }
      );
    }

    // Отправляем запрос на внешний сервис MMWB
    const response = await fetch(EXTERNAL_MMWB_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uri: stellarUri }),
    });

    // Получаем и парсим ответ
    const data = await response.json();

    // Проверяем наличие URL в ответе
    if (!data.url) {
      return NextResponse.json(
        { error: 'No URL in response from MMWB service' },
        { status: 500 }
      );
    }
    
    // Возвращаем ссылку клиенту
    return NextResponse.json({ telegramUrl: data.url });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process Stellar URI' },
      { status: 500 }
    );
  }
} 