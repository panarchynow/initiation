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
    console.log("API Route: Получен запрос в /api/stellar-uri");
    
    // Извлекаем SEP-0007 URI из тела запроса
    const body = await request.json();
    console.log("API Route: Полученное тело запроса:", body);
    
    const { stellarUri } = body;
    console.log("API Route: Получен stellarUri:", stellarUri ? `${stellarUri.substring(0, 50)}...` : "undefined");
    
    if (!stellarUri || !stellarUri.startsWith('web+stellar:')) {
      console.error("API Route: Некорректный формат URI");
      return NextResponse.json(
        { error: 'Invalid Stellar URI format' },
        { status: 400 }
      );
    }

    // Формируем параметры для внешнего сервиса
    const params = new URLSearchParams();
    params.append('uri', stellarUri);
    
    // Логируем полный URL и параметры запроса
    console.log("API Route: Отправляем запрос на:", EXTERNAL_MMWB_SERVICE_URL);
    console.log("API Route: Параметры запроса (URLSearchParams):", params.toString());
    console.log("API Route: Параметр uri:", stellarUri);
    
    // Для более подробного логирования посмотрим, что именно отправляется в body
    const formData = new FormData();
    formData.append('uri', stellarUri);
    console.log("API Route: Параметр uri длина:", stellarUri.length);
    
    // Отправляем запрос на внешний сервис MMWB
    try {
      const response = await fetch(EXTERNAL_MMWB_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      console.log("API Route: Получен ответ от внешнего сервиса, статус:", response.status);
      
      // Логируем заголовки ответа, преобразуя их в объект
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log("API Route: Заголовки ответа:", JSON.stringify(responseHeaders));

      // Логируем полный текст ответа для диагностики
      const responseText = await response.text();
      console.log("API Route: Полный ответ от сервиса:", responseText);

      // Пробуем распарсить JSON
      let data: { url?: string };
      try {
        data = JSON.parse(responseText);
        console.log("API Route: Распарсенный JSON:", data);
      } catch (e) {
        console.error("API Route: Ошибка парсинга JSON:", e);
        // Попробуем отправить запрос напрямую через fetch без Next.js
        // Это может помочь выявить проблемы, связанные с Next.js
        console.log("API Route: Пробуем отправить запрос напрямую через fetch...");
        
        try {
          // Используем node-fetch или глобальный fetch для прямого запроса
          const directResponse = await fetch(EXTERNAL_MMWB_SERVICE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'InitiationApp/1.0',
            },
            body: `uri=${encodeURIComponent(stellarUri)}`,
          });
          
          console.log("API Route: Прямой запрос, статус:", directResponse.status);
          const directResponseText = await directResponse.text();
          console.log("API Route: Прямой запрос, ответ:", directResponseText);
          
          try {
            const directData = JSON.parse(directResponseText);
            if (directData?.url) {
              console.log("API Route: Успешный прямой запрос, URL:", directData.url);
              return NextResponse.json({ telegramUrl: directData.url });
            }
          } catch (parseErr) {
            console.error("API Route: Ошибка парсинга JSON при прямом запросе:", parseErr);
          }
        } catch (directErr) {
          console.error("API Route: Ошибка при прямом запросе:", directErr);
        }
        
        return NextResponse.json(
          { error: `Invalid JSON response: ${responseText}` },
          { status: 500 }
        );
      }

      if (!response.ok) {
        console.error('API Route: Ошибка от внешнего сервиса:', responseText);
        return NextResponse.json(
          { error: `MMWB service error: ${response.statusText}` },
          { status: response.status }
        );
      }

      // Проверяем наличие URL в ответе
      if (!data.url) {
        console.error('API Route: В ответе отсутствует URL:', data);
        return NextResponse.json(
          { error: 'No Telegram URL in response from MMWB service' },
          { status: 500 }
        );
      }

      console.log('API Route: Успешный ответ, URL:', data.url);
      
      // Возвращаем ссылку на телеграм клиенту
      return NextResponse.json({ telegramUrl: data.url });
    } catch (fetchError) {
      console.error("API Route: Ошибка при выполнении fetch запроса:", fetchError);
      return NextResponse.json(
        { error: `Fetch error: ${String(fetchError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Route: Необработанная ошибка:', error);
    return NextResponse.json(
      { error: 'Failed to process Stellar URI', details: String(error) },
      { status: 500 }
    );
  }
} 