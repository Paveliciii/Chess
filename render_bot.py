import os
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv
import logging
from flask import Flask, request

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Загружаем переменные окружения из .env файла
load_dotenv()

# Получаем токены из переменных окружения
API_TOKEN = os.getenv('API_TOKEN')
GAME_SHORT_NAME = os.getenv('GAME_SHORT_NAME', 'Chess')
GAME_URL = os.getenv('GAME_URL', 'https://pavel-chess-game.netlify.app')
RAILWAY_DOMAIN = os.getenv('RAILWAY_DOMAIN', 'YOUR_RAILWAY_DOMAIN_HERE')  # например, chess-bot-production.up.railway.app

# Создаем экземпляр бота
bot = telebot.TeleBot(API_TOKEN)

# Flask-приложение для webhook
app = Flask(__name__)

@app.route('/' + API_TOKEN, methods=['POST'])
def getMessage():
    bot.process_new_updates([telebot.types.Update.de_json(request.stream.read().decode("utf-8"))])
    return "!", 200

@app.route('/', methods=['GET'])
def index():
    return 'Chess Bot is running!'

# Обработчик для команды /start
@bot.message_handler(commands=['start'])
def start(message):
    bot.send_message(
        message.chat.id,
        "Привет! Это мини-игра Шахматы. Нажми /play чтобы начать ♟️"
    )
    logger.info(f"Пользователь {message.from_user.username or message.from_user.id} запустил бота")

# Обработчик для команды /play
@bot.message_handler(commands=['play'])
def play(message):
    markup = InlineKeyboardMarkup()
    play_btn = InlineKeyboardButton(
        text="Играть в шахматы ♟️",
        callback_game={"game_short_name": GAME_SHORT_NAME}
    )
    markup.add(play_btn)
    bot.send_message(
        message.chat.id,
        "Нажми кнопку, чтобы начать игру в шахматы!",
        reply_markup=markup
    )
    logger.info(f"Пользователь {message.from_user.username or message.from_user.id} начал игру")

# Обработчик callback_query для запуска WebApp
@bot.callback_query_handler(func=lambda call: True)
def callback_query(call):
    if call.game_short_name == GAME_SHORT_NAME:
        bot.answer_callback_query(
            callback_query_id=call.id,
            url=GAME_URL  # Ссылка на ваш фронт на Netlify
        )
    else:
        bot.answer_callback_query(
            callback_query_id=call.id,
            text="Неизвестная игра."
        )
    logger.info(f"Получен callback_query от пользователя {call.from_user.username if hasattr(call, 'from_user') and hasattr(call.from_user, 'username') else 'Unknown'}")

# Запуск приложения
if __name__ == "__main__":
    # Удаляем старый webhook и устанавливаем новый
    bot.remove_webhook()
    webhook_url = f"https://{RAILWAY_DOMAIN}/{API_TOKEN}"
    bot.set_webhook(url=webhook_url)
    logger.info(f"Webhook установлен: {webhook_url}")
    
    # Запуск Flask приложения
    port = int(os.environ.get('PORT', 5000))
    app.run(host="0.0.0.0", port=port)

# Запуск приложения
if __name__ == "__main__":
    # Удаляем старый webhook и устанавливаем новый
    bot.remove_webhook()
    webhook_url = f"https://{RAILWAY_DOMAIN}/{API_TOKEN}"
    bot.set_webhook(url=webhook_url)
    logger.info(f"Webhook установлен: {webhook_url}")
    
    # Запуск Flask приложения
    port = int(os.environ.get('PORT', 5000))
    app.run(host="0.0.0.0", port=port)
            bot.answer_callback_query(
                callback_query_id=call.id,
                url=GAME_URL
            )
        else:
            # Обработка других типов callback-запросов
            bot.answer_callback_query(callback_query_id=call.id)
    except Exception as e:
        logger.error(f"Ошибка при обработке callback-запроса: {e}")
        # Отправляем URL игры в любом случае
        bot.answer_callback_query(
            callback_query_id=call.id,
            url=GAME_URL
        )

# Подготовка к запуску бота
def prepare_bot():
    try:
        # Сначала удаляем все существующие webhook
        logger.info("Удаляем существующие webhook...")
        bot.remove_webhook()
        
        # Сбрасываем все ожидающие обновления
        try:
            # Этот метод сбрасывает все ожидающие обновления
            bot.get_updates(offset=-1, limit=1)
            logger.info("Сбросили все ожидающие обновления")
        except Exception as e:
            logger.warning(f"Не удалось сбросить обновления: {e}")
        
        # Ждем немного, чтобы Telegram обработал запрос
        time.sleep(1)
    except Exception as e:
        logger.error(f"Ошибка при подготовке бота: {e}")

# Точка входа для запуска приложения
if __name__ == '__main__':
    # Выводим информацию о настройках
    logger.info(f"API_TOKEN: {'*' * (len(API_TOKEN) - 8) + API_TOKEN[-8:] if API_TOKEN else 'Not set'}")
    logger.info(f"GAME_SHORT_NAME: {GAME_SHORT_NAME}")
    logger.info(f"GAME_URL: {GAME_URL}")
    
    # Подготавливаем бота
    prepare_bot()
    
    # Запускаем бота в режиме polling
    logger.info("Бот запущен в режиме polling")
    bot.infinity_polling(timeout=10, long_polling_timeout=5, allowed_updates=["message", "callback_query"])
