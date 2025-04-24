"use client";

import { CID } from "multiformats/cid";

/**
 * Handles file uploads to IPFS via Pinata
 */
export async function uploadFile(file: File): Promise<string> {
  try {
    // Check file size
    if (file.size > 1048576) { // 1 MiB
      throw new Error("File size exceeds maximum allowed (1 MiB)");
    }
    
    // Создаем FormData для отправки файла
    const formData = new FormData();
    formData.append('file', file);
    
    // Отправляем запрос на наш API маршрут
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    if (!responseData.cid) {
      throw new Error("No IPFS hash returned from upload service");
    }
    
    // Проверяем, что полученный CID валидный
    if (!verifyIPFSHash(responseData.cid)) {
      throw new Error("Invalid IPFS CID format returned from server");
    }
    
    // Возвращаем CID файла
    return responseData.cid;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

/**
 * Проверяет, является ли строка валидным IPFS CID (Content Identifier)
 * Использует библиотеку multiformats/cid для проверки
 */
export function verifyIPFSHash(hash: string): boolean {
  try {
    // Пробуем распарсить CID
    CID.parse(hash);
    return true;
  } catch (error) {
    console.warn("Invalid IPFS CID format:", error);
    return false;
  }
}