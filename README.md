# Eurus Bot

This is a Telegram bot used for creating docx files.

## Getting Started

### Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org) v20 or later
- set `bot.start()` in the bot.ts file to use Polling

### Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/srkpi/eurus-bot.git
    cd eurus-bot
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file with the following contents:
    ```bash
    BOT_TOKEN=your_telegram_bot_token
    API_URL=your_api_url
    ```

4. Run the bot:
    ```bash
    npm run dev
    ```

To start a chat with the bot, send `/start` in your Telegram chat.
