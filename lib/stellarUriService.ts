"use client";

/**
 * Отправляет SEP-0007 URI на сервер и получает ссылку на Telegram бота MMWB
 * 
 * @param stellarUri - SEP-0007 URI для подписания транзакции
 * @returns Promise с URL для открытия в Telegram
 */
export async function addStellarUri(stellarUri: string): Promise<string> {
  try {
    console.log("stellarUriService: Начало запроса");
    console.log("stellarUriService: Исходный URI:", stellarUri);
    
    // Проверяем формат URI
    if (!stellarUri || !stellarUri.startsWith('web+stellar:')) {
      console.error("stellarUriService: Некорректный формат URI");
      throw new Error('Invalid Stellar URI format');
    }

    // Декодируем URI для проверки содержимого
    const decodedUri = decodeURIComponent(stellarUri);
    console.log("stellarUriService: Декодированный URI:", decodedUri);
    
    // Модифицируем URI, добавляя return_url, если его нет
    let modifiedUri = stellarUri;
    if (!stellarUri.includes('return_url=')) {
      const separator = stellarUri.includes('?') ? '&' : '?';
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      modifiedUri = `${stellarUri}${separator}return_url=${encodeURIComponent(currentUrl)}`;
      console.log("stellarUriService: Добавлен return_url к URI");
      console.log("stellarUriService: Модифицированный URI:", modifiedUri);
    }

    // Проверим, как URI будет выглядеть в form-urlencoded формате
    const testParams = new URLSearchParams();
    testParams.append('uri', modifiedUri);
    console.log("stellarUriService: URI в URLSearchParams:", testParams.toString());
    console.log("stellarUriService: Длина URI в байтах:", new TextEncoder().encode(modifiedUri).length);

    console.log("stellarUriService: Отправка запроса на API");
    
    // Отправляем запрос на наш API эндпоинт
    const response = await fetch('/api/stellar-uri', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stellarUri: modifiedUri }),
    });

    console.log("stellarUriService: Получен ответ от API, статус:", response.status);

    // Получаем полный текст ответа для логирования
    const responseText = await response.text();
    console.log("stellarUriService: Текст ответа:", responseText);
    
    // Пытаемся распарсить JSON из ответа
    let data: { error?: string; telegramUrl?: string };
    try {
      data = JSON.parse(responseText);
      console.log("stellarUriService: Распарсенный ответ:", data);
    } catch (e) {
      console.error("stellarUriService: Ошибка парсинга JSON:", e);
      throw new Error(`Failed to parse API response: ${responseText}`);
    }

    if (!response.ok) {
      console.error("stellarUriService: Ошибка от API:", data?.error || responseText);
      throw new Error(data?.error || `Request failed: ${response.status}`);
    }

    // Проверяем наличие telegramUrl в ответе
    if (!data.telegramUrl) {
      console.error("stellarUriService: В ответе отсутствует telegramUrl:", data);
      throw new Error('No Telegram URL returned from the server');
    }

    console.log("stellarUriService: Успешно получен URL:", data.telegramUrl);
    return data.telegramUrl;
  } catch (error) {
    console.error('Error getting Telegram URL:', error);
    throw error;
  }
} 