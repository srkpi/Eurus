import { api, fetchAllDocumentsRequest, fetchDocumentByIdRequest, createDocumentRequest, deleteDocumentRequest } from "../api/api";
import { decodeFilename, formatFilesList, changeFileType, changeFileProperties } from "../utils/utils";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";

const { BOT_TOKEN: token = "" } = process.env;
export const bot = new Bot(token);

//сховище для стоврення та зміни записки, відстежування стану
const state = {};

// id для зміни файлу
let editFileId = 0;

const startDescription = "Перезапустити бота";
const helpDescription = "Переглянути список команд";
const createfileDescription = "Створити файл";
const listfilesDescription = "Переглянути всі файли";
const getfileDescription = "Завантажити файл";
const editfileDescription = "Змінити файл";
const deletefileDescription = "Видалити файл";

bot.api.setMyCommands([
    { command: "start", description: startDescription },
    { command: "help", description: helpDescription },
    { command: "createfile", description: createfileDescription },
    { command: "listfiles", description: listfilesDescription },
    { command: "getfile", description: getfileDescription },
    { command: "editfile", description: editfileDescription },
    { command: "deletefile", description: deletefileDescription },
]);

// команда для Вітаннячка
bot.command("start", async (ctx) => {
    state[ctx.chat.id] = {};

    await ctx.reply("Вітаю! \nЦей Бот допомагає створити службову записку. Для створення натисніть /createfile");
});

bot.command("help", async (ctx) => {
    await ctx.reply(
        `/start - ${startDescription}\n` +
            `/help - ${helpDescription}\n` +
            `/createfile - ${createfileDescription}\n` +
            `/listfiles - ${listfilesDescription}\n` +
            `/getfile - ${getfileDescription}\n` +
            `/editfile - ${editfileDescription}\n` +
            `/deletefile - ${deletefileDescription}`,
    );
});

bot.command("createfile", async (ctx) => {
    state[ctx.chat.id] = {};

    const keyboard = new InlineKeyboard().text("Службова записка", "service_memo").text("Подання", "submission").text("Звернення", "appeal");

    await ctx.reply("Будь ласка, виберіть тип документу:", { reply_markup: keyboard });
    state[ctx.chat.id].step = "choose_type";
});

bot.command("listfiles", async (ctx) => {
    state[ctx.chat.id] = {};

    try {
        const response = await fetchAllDocumentsRequest();
        const responseData = response.data;

        if (Array.isArray(responseData) && responseData.length === 0) {
            await ctx.reply("Записів нема");
        } else {
            const formattedData = formatFilesList(responseData);

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
    state[ctx.chat.id] = {};

    state[ctx.chat.id].isGetFile = true;
    await ctx.reply("Введіть id файлу який ви хочете отримати:");
});

bot.command("editfile", async (ctx) => {
    state[ctx.chat.id] = {};

    state[ctx.chat.id].isEditFile = true;
    await ctx.reply("Введіть id файлу який ви хочете змінити:");
});

bot.command("deletefile", async (ctx) => {
    state[ctx.chat.id] = {};

    state[ctx.chat.id].isDeleteFile = true;
    await ctx.reply("Введіть id файлу який ви хочете видалити:");
});

bot.callbackQuery("service_memo", async (ctx) => {
    state[ctx.chat.id].type = "СЛУЖБОВА ЗАПИСКА";
    state[ctx.chat.id].step = "receiver";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("submission", async (ctx) => {
    state[ctx.chat.id].type = "ПОДАННЯ";
    state[ctx.chat.id].step = "receiver";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("appeal", async (ctx) => {
    state[ctx.chat.id].type = "ЗВЕРНЕННЯ";
    state[ctx.chat.id].step = "receiver";
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
    const serviceMemoString = "Службова записка";
    try {
        const { stringToReply, inputFile } = await changeFileType(editFileId, serviceMemoString);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`Помилка при зміні типу файлу на «${serviceMemoString}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("newSubmission", async (ctx) => {
    const submissionString = "Подання";
    try {
        const { stringToReply, inputFile } = await changeFileType(editFileId, submissionString);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`Помилка при зміні типу файлу на «${submissionString}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("newAppeal", async (ctx) => {
    const appealString = "Звернення";
    try {
        const { stringToReply, inputFile } = await changeFileType(editFileId, appealString);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`Помилка при зміні типу файлу на «${appealString}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("receiver", async (ctx) => {
    await ctx.reply("Введіть нового одержувача:");
    state[ctx.chat.id].step = "newReceiver";
});

bot.callbackQuery("title", async (ctx) => {
    await ctx.reply("Введіть нову назву:");
    state[ctx.chat.id].step = "newTitle";
});

bot.callbackQuery("content", async (ctx) => {
    await ctx.reply("Введіть новий текст:");
    state[ctx.chat.id].step = "newContent";
});

bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    async function createDocument(chatId, ctx: Context) {
        const { receiver, title, content, type } = state[chatId];

        try {
            const response = await createDocumentRequest({ receiver: receiver, title: title, content: content, type: type });

            const contentDisposition = response.headers["content-disposition"];
            const filename = decodeFilename(contentDisposition);

            await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
        } catch (error) {
            await ctx.reply("Помилка при створенні запису");
            await ctx.reply(error);
        }
    }

    if (state[ctx.chat.id].isGetFile) {
        state[ctx.chat.id].isGetFile = false;

        try {
            const response = await fetchDocumentByIdRequest(text);

            const contentDisposition = response.headers["content-disposition"];
            const filename = decodeFilename(contentDisposition);

            await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
        } catch (error) {
            await ctx.reply("Помилка при отриманні запису");
        }
    }

    if (state[ctx.chat.id].isEditFile) {
        state[ctx.chat.id].isEditFile = false;

        editFileId = parseInt(text);

        // Check if there is file with such id
        try {
            const response = await fetchAllDocumentsRequest();
            const responseData = response.data;

            if (Array.isArray(responseData) && responseData.length === 0) {
                await ctx.reply("Записів нема");
            } else {
                if (!responseData.some((item) => item.id == text)) {
                    const formattedData = formatFilesList(responseData);

                    await ctx.reply(`Такого файлу не існує\\. Введіть правильний id одного з цих файлів\\:\n${formattedData}`, {
                        parse_mode: "MarkdownV2",
                    });

                    state[ctx.chat.id].isEditFile = true;
                    return;
                }
            }
        } catch (error) {
            await ctx.reply("Помилка при перевірці id");
            await ctx.reply(error);
        }

        const keyboard = new InlineKeyboard().text("Тип файлу", "type").text("Одержувача", "receiver").text("Назву", "title").text("Текст", "content");
        await ctx.reply("Що ви хочете змінити?", { reply_markup: keyboard });
    }

    if (state[ctx.chat.id].isDeleteFile) {
        state[ctx.chat.id].isDeleteFile = false;

        try {
            await deleteDocumentRequest(text);

            await ctx.reply(`Файл №${text} було успішно видалено`);
        } catch (error) {
            await ctx.reply("Помилка при видаленні запису");
        }
    }

    if (!state[chatId]) return;

    switch (state[chatId].step) {
        case "receiver":
            state[chatId].receiver = text;
            state[chatId].step = "title";
            await ctx.reply("Введіть тему записки:");
            break;
        case "title":
            state[chatId].title = text;
            state[chatId].step = "content";
            await ctx.reply("Введіть текст записки:");
            break;
        case "content":
            state[chatId].content = text;
            await createDocument(chatId, ctx);
            await ctx.reply("Записка створена!");
            state[ctx.chat.id] = {};
            break;
        case "newReceiver":
            state[ctx.chat.id] = {};
            try {
                const { stringToReply, inputFile } = await changeFileProperties(editFileId, { receiver: text });

                await ctx.reply(stringToReply);
                await ctx.replyWithDocument(inputFile);
            } catch (error) {
                await ctx.reply(`Помилка при зміні одержувача на «${text}»`);
                await ctx.reply(error);
            }

            break;
        case "newTitle":
            state[ctx.chat.id] = {};
            try {
                const { stringToReply, inputFile } = await changeFileProperties(editFileId, { title: text });

                await ctx.reply(stringToReply);
                await ctx.replyWithDocument(inputFile);
            } catch (error) {
                await ctx.reply(`Помилка при зміні назви на «${text}»`);
                await ctx.reply(error);
            }

            break;
        case "newContent":
            state[ctx.chat.id] = {};
            try {
                const { stringToReply, inputFile } = await changeFileProperties(editFileId, { content: text });

                await ctx.reply(stringToReply);
                await ctx.replyWithDocument(inputFile);
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
