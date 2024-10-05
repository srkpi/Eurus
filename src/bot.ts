import axios from "axios";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";

const { BOT_TOKEN: token = "" } = process.env;
export const bot = new Bot(token);

let isGetFile = false;

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

bot.command("notelist", async (ctx) => {
    try {
        const response = await axios.get("https://sr-kpi-api-development.up.railway.app/documents/notes");
        const formattedData = response.data
            .map((item, index) => `${index + 1}\\) ${item.name.replaceAll(".", "\\.").replaceAll("_", "\\_")} \\- \`${item.id}\``)
            .join("\n");

        await ctx.reply(`${formattedData}`, {
            parse_mode: "MarkdownV2",
        });
    } catch (error) {
        await ctx.reply("Помилка при отриманні записів");
        await ctx.reply(error);
    }
});

bot.command("getfile", async (ctx) => {
    isGetFile = true;
    await ctx.reply("Введіть id файлу який ви хочете отримати:");
});

bot.callbackQuery("service_memo", async (ctx) => {
    memoData[ctx.chat.id].type = "СЛУЖБОВА ЗАПИСКА";
    memoData[ctx.chat.id].step = "recipient";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("submission", async (ctx) => {
    memoData[ctx.chat.id].type = "ПОДАННЯ";
    memoData[ctx.chat.id].step = "recipient";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("appeal", async (ctx) => {
    memoData[ctx.chat.id].type = "ЗВЕРНЕННЯ";
    memoData[ctx.chat.id].step = "recipient";
    await ctx.reply("Введіть одержувача:");
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
                "https://sr-kpi-api-development.up.railway.app/documents/note",
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
            await ctx.reply("Помилка при створенні запису");
            await ctx.reply(error);
        }
    }

    if (isGetFile) {
        isGetFile = false;

        try {
            const response = await axios.get(`https://sr-kpi-api-development.up.railway.app/documents/note/${text}`, { responseType: "arraybuffer", })

            const contentDisposition = response.headers["content-disposition"];
            const filename = decodeFilename(contentDisposition);

            await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
        } catch (error) {
            await ctx.reply("Помилка при отриманні запису");
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

bot.catch((err) => {
    console.error(`Error: ${err.error}`);
});
