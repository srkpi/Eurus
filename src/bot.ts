import { api, fetchAllDocumentsRequest, fetchDocumentByIdRequest, createDocumentRequest, deleteDocumentRequest } from "../api/api";
import { decodeFilename, formatFilesList, changeFileType, changeFileProperties } from "../utils/utils";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";

const { BOT_TOKEN: token = "" } = process.env;
export const bot = new Bot(token);

let isGetFile = false;
let isDeleteFile = false;
let isEditFile = false;

//сховище для стоврення та зміни записки
const memoData = {};

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
    isGetFile = false;
    isDeleteFile = false;
    isEditFile = false;
    delete memoData[ctx.chat.id];

    await ctx.reply("Вітаю! \nЦей Бот допомагає створити службову записку. Для створення натисніть /create_file");
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
    isGetFile = false;
    isDeleteFile = false;
    isEditFile = false;
    delete memoData[ctx.chat.id];

    const keyboard = new InlineKeyboard().text("Службова записка", "service_memo").text("Подання", "submission").text("Звернення", "appeal");

    await ctx.reply("Будь ласка, виберіть тип документу:", { reply_markup: keyboard });
    memoData[ctx.chat.id] = { step: "choose_type" };
});

bot.command("listfiles", async (ctx) => {
    isGetFile = false;
    isDeleteFile = false;
    isEditFile = false;
    delete memoData[ctx.chat.id];

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
    isDeleteFile = false;
    isEditFile = false;
    delete memoData[ctx.chat.id];

    isGetFile = true;
    await ctx.reply("Введіть id файлу який ви хочете отримати:");
});

bot.command("editfile", async (ctx) => {
    isGetFile = false;
    isDeleteFile = false;
    delete memoData[ctx.chat.id];

    isEditFile = true;
    await ctx.reply("Введіть id файлу який ви хочете змінити:");
});

bot.command("deletefile", async (ctx) => {
    isGetFile = false;
    isEditFile = false;
    delete memoData[ctx.chat.id];

    isDeleteFile = true;
    await ctx.reply("Введіть id файлу який ви хочете видалити:");
});

bot.callbackQuery("service_memo", async (ctx) => {
    memoData[ctx.chat.id].type = "СЛУЖБОВА ЗАПИСКА";
    memoData[ctx.chat.id].step = "receiver";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("submission", async (ctx) => {
    memoData[ctx.chat.id].type = "ПОДАННЯ";
    memoData[ctx.chat.id].step = "receiver";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("appeal", async (ctx) => {
    memoData[ctx.chat.id].type = "ЗВЕРНЕННЯ";
    memoData[ctx.chat.id].step = "receiver";
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
        const { receiver, title, content, type } = memoData[chatId];

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

    if (isGetFile) {
        isGetFile = false;

        try {
            const response = await fetchDocumentByIdRequest(text);

            const contentDisposition = response.headers["content-disposition"];
            const filename = decodeFilename(contentDisposition);

            await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
        } catch (error) {
            await ctx.reply("Помилка при отриманні запису");
        }
    }

    if (isEditFile) {
        isEditFile = false;

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

                    isEditFile = true;
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

    if (isDeleteFile) {
        isDeleteFile = false;

        try {
            await deleteDocumentRequest(text);

            await ctx.reply(`Файл №${text} було успішно видалено`);
        } catch (error) {
            await ctx.reply("Помилка при видаленні запису");
        }
    }

    if (!memoData[chatId]) return;

    switch (memoData[chatId].step) {
        case "receiver":
            memoData[chatId].receiver = text;
            memoData[chatId].step = "title";
            await ctx.reply("Введіть тему записки:");
            break;
        case "title":
            memoData[chatId].title = text;
            memoData[chatId].step = "content";
            await ctx.reply("Введіть текст записки:");
            break;
        case "content":
            memoData[chatId].content = text;
            await createDocument(chatId, ctx);
            await ctx.reply("Записка створена!");
            delete memoData[chatId];
            break;
        case "newReceiver":
            delete memoData[ctx.chat.id];
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
            delete memoData[ctx.chat.id];
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
            delete memoData[ctx.chat.id];
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
