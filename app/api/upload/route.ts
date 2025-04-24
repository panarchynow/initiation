import { NextResponse } from 'next/server';
import { PinataSDK } from "pinata";

// Проверяем, что PINATA_JWT установлена
if (!process.env.PINATA_JWT) {
  console.error('PINATA_JWT не настроен. Убедитесь, что он настроен в .env.local');
}

// Инициализируем Pinata SDK
const pinata = process.env.PINATA_JWT 
  ? new PinataSDK({ pinataJwt: process.env.PINATA_JWT })
  : null;

// Обработчик POST запроса для загрузки файла
export async function POST(request: Request) {
  try {
    // Проверяем инициализацию SDK
    if (!pinata) {
      return NextResponse.json(
        { success: false, error: 'Pinata не настроена, отсутствует PINATA_JWT' },
        { status: 500 }
      );
    }

    // Получаем FormData из запроса
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Файл не найден в запросе' },
        { status: 400 }
      );
    }

    // Загружаем файл в IPFS через SDK Pinata
    const result = await pinata.upload.public.file(file);

    // Возвращаем успешный ответ с CID и другими данными
    return NextResponse.json({
      success: true,
      cid: result.cid,
      name: result.name,
      size: result.size,
      ipfsUrl: `ipfs://${result.cid}`
    });
  } catch (error) {
    console.error('Ошибка в обработчике маршрута:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      },
      { status: 500 }
    );
  }
} 