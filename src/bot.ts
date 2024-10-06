import axios from "axios";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";

const { BOT_TOKEN: token = "" } = process.env;
export const bot = new Bot(token);

let isGetFile = false;
let isDeleteNote = false;
let isEditNote = false;

//сховище для стоврення та зміни записки
const memoData = {};

// id для зміни файлу
let editFileId = 0;

const instance = axios.create({
    baseURL: "https://sr-kpi-api-development.up.railway.app",
});

function decodeFilename(contentDisposition) {
    const match = contentDisposition.match(/filename\*?=['"]?([^;]*)['"]?/);
    if (match && match[1]) {
        return decodeURIComponent(match[1].replace(/UTF-8''/, ""));
    }
    return "unknown_filename";
}

// команда для Вітаннячка
bot.command("start", async (ctx) => {
    isGetFile = false;
    isDeleteNote = false;
    isEditNote = false;
    delete memoData[ctx.chat.id];

    await ctx.reply("Вітаю! \nЦей Бот допомагає створити службову записку. Для створення натисніть /createnote ");
});

bot.command("createnote", async (ctx) => {
    isGetFile = false;
    isDeleteNote = false;
    isEditNote = false;
    delete memoData[ctx.chat.id];

    const keyboard = new InlineKeyboard().text("Службова записка", "service_memo").text("Подання", "submission").text("Звернення", "appeal");

    await ctx.reply("Будь ласка, виберіть тип документу:", { reply_markup: keyboard });
    memoData[ctx.chat.id] = { step: "choose_type" };
});

bot.command("notelist", async (ctx) => {
    isGetFile = false;
    isDeleteNote = false;
    isEditNote = false;
    delete memoData[ctx.chat.id];

    try {
        const response = await instance.get("/documents/notes");

        if (Array.isArray(response.data) && response.data.length === 0) {
            await ctx.reply("Записів нема");
        } else {
            const formattedData = response.data
                .map((item, index) => `${index + 1}\\) ${item.name.replaceAll(".", "\\.").replaceAll("_", "\\_")} \\- \`${item.id}\``)
                .join("\n");

            await ctx.reply(`${formattedData}`, {
                parse_mode: "MarkdownV2",
            });
        }
    } catch (error) {
        await ctx.reply("Помилка при отриманні записів");
        await ctx.reply(error);
    }
});

bot.command("getfile", async (ctx) => {
    isDeleteNote = false;
    isEditNote = false;
    delete memoData[ctx.chat.id];

    isGetFile = true;
    await ctx.reply("Введіть id файлу який ви хочете отримати:");
});

bot.command("editnote", async (ctx) => {
    isGetFile = false;
    isDeleteNote = false;
    delete memoData[ctx.chat.id];

    isEditNote = true;
    await ctx.reply("Введіть id файлу який ви хочете змінити:");
});

bot.command("deletenote", async (ctx) => {
    isGetFile = false;
    isEditNote = false;
    delete memoData[ctx.chat.id];

    isDeleteNote = true;
    await ctx.reply("Введіть id файлу який ви хочете видалити:");
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

bot.callbackQuery("back", async (ctx) => {
    const keyboard = new InlineKeyboard().text("Тип файлу", "type").text("Одержувача", "receiver").text("Назву", "title").text("Текст", "content");
    await ctx.reply("Що ви хочете змінити?", { reply_markup: keyboard });
});

bot.callbackQuery("type", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text("Службова записка", "newServiceMemo")
        .text("Подання", "newSubmission")
        .text("Звернення", "newAppeal")
        .text("Повернутись", "back");
    await ctx.reply("Оберіть новий тип документу:", { reply_markup: keyboard });
});

bot.callbackQuery("newServiceMemo", async (ctx) => {
    try {
        const response = await instance.patch(
            "/documents/note",
            {
                id: editFileId,
                type: "СЛУЖБОВА ЗАПИСКА",
            },
            {
                responseType: "arraybuffer",
            },
        );

        const contentDisposition = response.headers["content-disposition"];
        const filename = decodeFilename(contentDisposition);

        await ctx.reply("Тип файлу було змінено на «Службова записка»:");
        await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
    } catch (error) {
        await ctx.reply("Помилка при зміні типу файлу на «Службова записка»");
        await ctx.reply(error);
    }
});

bot.callbackQuery("newSubmission", async (ctx) => {
    try {
        const response = await instance.patch(
            "/documents/note",
            {
                id: editFileId,
                type: "ПОДАННЯ",
            },
            {
                responseType: "arraybuffer",
            },
        );

        const contentDisposition = response.headers["content-disposition"];
        const filename = decodeFilename(contentDisposition);

        await ctx.reply("Тип файлу було змінено на «Подання»:");
        await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
    } catch (error) {
        await ctx.reply("Помилка при зміні типу файлу на «Подання»");
        await ctx.reply(error);
    }
});

bot.callbackQuery("newAppeal", async (ctx) => {
    try {
        const response = await instance.patch(
            "/documents/note",
            {
                id: editFileId,
                type: "ЗВЕРНЕННЯ",
            },
            {
                responseType: "arraybuffer",
            },
        );

        const contentDisposition = response.headers["content-disposition"];
        const filename = decodeFilename(contentDisposition);

        await ctx.reply("Тип файлу було змінено на «Звернення»:");
        await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
    } catch (error) {
        await ctx.reply("Помилка при зміні типу файлу на «Звернення»");
        await ctx.reply(error);
    }
});

bot.callbackQuery("receiver", async (ctx) => {
    await ctx.reply("Введіть нового одержувача:");
    memoData[ctx.chat.id] = { step: "newReceiver" };
});

bot.callbackQuery("title", async (ctx) => {
    await ctx.reply("Введіть нову назву:");
    memoData[ctx.chat.id] = { step: "newTitle" };
});

bot.callbackQuery("content", async (ctx) => {
    await ctx.reply("Введіть новий текст:");
    memoData[ctx.chat.id] = { step: "newContent" };
});

bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    async function createDocument(chatId, ctx: Context) {
        const { recipient, subject, text, type } = memoData[chatId];

        try {
            const response = await instance.post(
                "/documents/note",
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
            const response = await instance.get(`/documents/note/${text}`, { responseType: "arraybuffer" });

            const contentDisposition = response.headers["content-disposition"];
            const filename = decodeFilename(contentDisposition);

            await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
        } catch (error) {
            await ctx.reply("Помилка при отриманні запису");
        }
    }

    if (isEditNote) {
        isEditNote = false;

        editFileId = parseInt(text);
        // TODO: Check if there is file with such id

        const keyboard = new InlineKeyboard().text("Тип файлу", "type").text("Одержувача", "receiver").text("Назву", "title").text("Текст", "content");
        await ctx.reply("Що ви хочете змінити?", { reply_markup: keyboard });
    }

    if (isDeleteNote) {
        isDeleteNote = false;

        try {
            await instance.delete(`/documents/note/${text}`);

            await ctx.reply(`Файл №${text} було успішно видалено`);
        } catch (error) {
            await ctx.reply("Помилка при видаленні запису");
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
        case "newReceiver":
            delete memoData[ctx.chat.id];
            try {
                const response = await instance.patch(
                    "/documents/note",
                    {
                        id: editFileId,
                        receiver: text,
                    },
                    {
                        responseType: "arraybuffer",
                    },
                );

                const contentDisposition = response.headers["content-disposition"];
                const filename = decodeFilename(contentDisposition);

                await ctx.reply(`Одержувача було змінено на «${text}»:`);
                await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
            } catch (error) {
                await ctx.reply(`Помилка при зміні одержувача на «${text}»`);
                await ctx.reply(error);
            }

            break;
        case "newTitle":
            delete memoData[ctx.chat.id];
            try {
                const response = await instance.patch(
                    "/documents/note",
                    {
                        id: editFileId,
                        title: text,
                    },
                    {
                        responseType: "arraybuffer",
                    },
                );

                const contentDisposition = response.headers["content-disposition"];
                const filename = decodeFilename(contentDisposition);

                await ctx.reply(`Назву було змінено на «${text}»:`);
                await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
            } catch (error) {
                await ctx.reply(`Помилка при зміні назви на «${text}»`);
                await ctx.reply(error);
            }

            break;
        case "newContent":
            delete memoData[ctx.chat.id];
            try {
                const response = await instance.patch(
                    "/documents/note",
                    {
                        id: editFileId,
                        content: text,
                    },
                    {
                        responseType: "arraybuffer",
                    },
                );

                const contentDisposition = response.headers["content-disposition"];
                const filename = decodeFilename(contentDisposition);

                await ctx.reply(`Текст було змінено на «${text}»:`);
                await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
            } catch (error) {
                await ctx.reply(`Помилка при зміні тексту на «${text}»`);
                await ctx.reply(error);
            }

            break;
    }
});

bot.catch((err) => {
    console.error(`Error: ${err.error}`);
});
