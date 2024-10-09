import { fetchAllDocumentsRequest, fetchDocumentByIdRequest, createDocumentRequest, deleteDocumentRequest } from "../api/api";
import { decodeFilename, formatFilesList, changeFileType, changeFileProperties } from "../utils/utils";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";

const { BOT_TOKEN: token = "" } = process.env;
export const bot = new Bot(token);

interface State {
    step: string;
    isDeleteFile: boolean;
    isEditFile: boolean;
    editFileId: number;
    isGetFile: boolean;
    receiver: string;
    title: string;
    content: string;
    type: string;
}

//сховище для стоврення та зміни записки, відстежування стану
const states: { [chatid: string]: State } = {};

function clearState(chatId) {
    states[chatId] = {
        step: "",
        isDeleteFile: false,
        isEditFile: false,
        editFileId: 0,
        isGetFile: false,
        receiver: "",
        title: "",
        content: "",
        type: "",
    };
}

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
    const chatId = ctx.chat.id;
    clearState(chatId);

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
    const chatId = ctx.chat.id;
    clearState(chatId);

    const keyboard = new InlineKeyboard().text("Службова записка", "service_memo").text("Подання", "submission").text("Звернення", "appeal");

    await ctx.reply("Будь ласка, виберіть тип документу:", { reply_markup: keyboard });
    states[chatId].step = "choose_type";
});

bot.command("listfiles", async (ctx) => {
    const chatId = ctx.chat.id;
    clearState(chatId);

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
    const chatId = ctx.chat.id;
    clearState(chatId);

    states[chatId].isGetFile = true;
    await ctx.reply("Введіть id файлу який ви хочете отримати:");
});

bot.command("editfile", async (ctx) => {
    const chatId = ctx.chat.id;
    clearState(chatId);

    states[chatId].isEditFile = true;
    await ctx.reply("Введіть id файлу який ви хочете змінити:");
});

bot.command("deletefile", async (ctx) => {
    const chatId = ctx.chat.id;
    clearState(chatId);

    states[chatId].isDeleteFile = true;
    await ctx.reply("Введіть id файлу який ви хочете видалити:");
});

bot.callbackQuery("service_memo", async (ctx) => {
    const chatId = ctx.chat.id;

    states[chatId].type = "СЛУЖБОВА ЗАПИСКА";
    states[chatId].step = "receiver";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("submission", async (ctx) => {
    const chatId = ctx.chat.id;

    states[chatId].type = "ПОДАННЯ";
    states[chatId].step = "receiver";
    await ctx.reply("Введіть одержувача:");
});

bot.callbackQuery("appeal", async (ctx) => {
    const chatId = ctx.chat.id;

    states[chatId].type = "ЗВЕРНЕННЯ";
    states[chatId].step = "receiver";
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
    const chatId = ctx.chat.id;

    const serviceMemoString = "Службова записка";
    try {
        const { stringToReply, inputFile } = await changeFileType(states[chatId].editFileId, serviceMemoString);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`Помилка при зміні типу файлу на «${serviceMemoString}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("newSubmission", async (ctx) => {
    const chatId = ctx.chat.id;

    const submissionString = "Подання";
    try {
        const { stringToReply, inputFile } = await changeFileType(states[chatId].editFileId, submissionString);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`Помилка при зміні типу файлу на «${submissionString}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("newAppeal", async (ctx) => {
    const chatId = ctx.chat.id;

    const appealString = "Звернення";
    try {
        const { stringToReply, inputFile } = await changeFileType(states[chatId].editFileId, appealString);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`Помилка при зміні типу файлу на «${appealString}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("receiver", async (ctx) => {
    const chatId = ctx.chat.id;

    await ctx.reply("Введіть нового одержувача:");
    states[chatId].step = "newReceiver";
});

bot.callbackQuery("title", async (ctx) => {
    const chatId = ctx.chat.id;

    await ctx.reply("Введіть нову назву:");
    states[chatId].step = "newTitle";
});

bot.callbackQuery("content", async (ctx) => {
    const chatId = ctx.chat.id;

    await ctx.reply("Введіть новий текст:");
    states[chatId].step = "newContent";
});

bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    async function createDocument(chatId, ctx: Context) {
        const { receiver, title, content, type } = states[chatId];

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

    if (states[chatId].isGetFile) {
        states[chatId].isGetFile = false;

        try {
            const response = await fetchDocumentByIdRequest(text);

            const contentDisposition = response.headers["content-disposition"];
            const filename = decodeFilename(contentDisposition);

            await ctx.replyWithDocument(new InputFile(Buffer.from(response.data), filename));
        } catch (error) {
            await ctx.reply("Помилка при отриманні запису");
        }
    }

    if (states[chatId].isEditFile) {
        states[chatId].isEditFile = false;

        states[chatId].editFileId = parseInt(text);

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

                    states[chatId].isEditFile = true;
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

    if (states[chatId].isDeleteFile) {
        states[chatId].isDeleteFile = false;

        try {
            await deleteDocumentRequest(text);

            await ctx.reply(`Файл №${text} було успішно видалено`);
        } catch (error) {
            await ctx.reply("Помилка при видаленні запису");
        }
    }

    if (!states[chatId]) return;

    switch (states[chatId].step) {
        case "receiver":
            states[chatId].receiver = text;
            states[chatId].step = "title";
            await ctx.reply("Введіть тему записки:");
            break;
        case "title":
            states[chatId].title = text;
            states[chatId].step = "content";
            await ctx.reply("Введіть текст записки:");
            break;
        case "content":
            states[chatId].content = text;
            await createDocument(chatId, ctx);
            await ctx.reply("Записка створена!");
            clearState(chatId);
            break;
        case "newReceiver":
            clearState(chatId);
            try {
                const { stringToReply, inputFile } = await changeFileProperties(states[chatId].editFileId, { receiver: text });

                await ctx.reply(stringToReply);
                await ctx.replyWithDocument(inputFile);
            } catch (error) {
                await ctx.reply(`Помилка при зміні одержувача на «${text}»`);
                await ctx.reply(error);
            }

            break;
        case "newTitle":
            clearState(chatId);
            try {
                const { stringToReply, inputFile } = await changeFileProperties(states[chatId].editFileId, { title: text });

                await ctx.reply(stringToReply);
                await ctx.replyWithDocument(inputFile);
            } catch (error) {
                await ctx.reply(`Помилка при зміні назви на «${text}»`);
                await ctx.reply(error);
            }

            break;
        case "newContent":
            clearState(chatId);
            try {
                const { stringToReply, inputFile } = await changeFileProperties(states[chatId].editFileId, { content: text });

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
