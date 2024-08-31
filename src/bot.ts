import axios from "axios";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";

const { BOT_TOKEN: token = "" } = process.env;
export const bot = new Bot(token);

//сховище для стоврення записки
const memoData = {};

// команда для Вітаннячка
bot.command("start", async (ctx) => {
    await ctx.reply("Вітаю! \nЦей Бот допомагає створити службову записку. Для створення натисніть /createnote ");
});

bot.command("createnote", async (ctx) => {
    const keyboard = new InlineKeyboard().text("Службова записка", "service_memo").text("Подання", "submission").text("Звернення", "appeal");

    await ctx.reply("Будь ласка, виберіть тип документу:", { reply_markup: keyboard });
    memoData[ctx.chat.id] = { step: "choose_type" };
});

bot.callbackQuery("service_note", async (ctx) => {
    memoData[ctx.chat.id].type = "Службова записка";
    memoData[ctx.chat.id].step = "recipient";
    await ctx.reply("Введіть одержувача:");
    await ctx.answerCallbackQuery();
});

bot.callbackQuery("submission", async (ctx) => {
    memoData[ctx.chat.id].type = "Подання";
    memoData[ctx.chat.id].step = "recipient";
    await ctx.reply("Введіть одержувача:");
    await ctx.answerCallbackQuery();
});

bot.callbackQuery("appeal", async (ctx) => {
    memoData[ctx.chat.id].type = "Звернення";
    memoData[ctx.chat.id].step = "recipient";
    await ctx.reply("Введіть одержувача:");
    await ctx.answerCallbackQuery();
});

bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    function decodeFilename(contentDisposition) {
        const match = contentDisposition.match(/filename\*?=['"]?([^;]*)['"]?/);
        if (match && match[1]) {
            return decodeURIComponent(match[1].replace(/UTF-8''/, ""));
        }
        return "unknown_filename";
    }

    async function createDocument(chatId, ctx: Context) {
        const { recipient, subject, text, type } = memoData[chatId];

        try {
            const response = await axios.post(
                "https://sr-kpi-api-development.up.railway.app/documents/service-note",
                {
                    receiver: recipient,
                    title: subject,
                    content: text,
                    type: type,
                },
                {
                    responseType: "arraybuffer",
                },
            );

            const contentDisposition = response.headers["content-disposition"];
            const filename = decodeFilename(contentDisposition);

            await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
        } catch (error) {
            await ctx.reply(error);
            await ctx.reply("Помилка при створенні запису");
        }
    }

    if (!memoData[chatId]) return;

    switch (memoData[chatId].step) {
        case "recipient":
            memoData[chatId].recipient = text;
            memoData[chatId].step = "subject";
            await ctx.reply("Введіть тему записки:");
            break;
        case "subject":
            memoData[chatId].subject = text;
            memoData[chatId].step = "text";
            await ctx.reply("Введіть текст записки:");
            break;
        case "text":
            memoData[chatId].text = text;
            await createDocument(chatId, ctx);
            await ctx.reply("Записка створена!");
            delete memoData[chatId];
            break;
    }
});
