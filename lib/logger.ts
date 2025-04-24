// Простой логгер Pino для использования в браузере и на сервере
import pino from 'pino';

// Определяем уровень логирования в зависимости от окружения
const logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'error';

// Настройки логгера для браузера
const options = {
  // Уровень логирования зависит от окружения
  level: logLevel,
  
  // Опции для браузера
  browser: {
    // Не использовать дополнительные опции - просто выводить в консоль как есть
    asObject: false,
    // Стандартное поведение в браузере - использование console.log/warn/error/etc.
    write: undefined
  }
};

// Создаем экземпляр логгера
export const logger = pino(options); 