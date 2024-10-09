import { fetchAllDocumentsRequest, fetchDocumentByIdRequest, createDocumentRequest, deleteDocumentRequest } from "../api/api";
import { decodeFilename, formatFilesList, changeFileType, changeFileProperties } from "../utils/utils";
import { Bot, Context, InputFile, InlineKeyboard } from "grammy";
import { config } from "dotenv";
config();

const token = process.env.BOT_TOKEN;
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

const messages = {
    start: "Вітаю! \nЦей Бот допомагає створити службову записку, подання або звернення. Для створення натисніть /createfile",
    selectDocumentType: "Будь ласка, виберіть тип документа:",
    serviceMemo: "Службова записка",
    submission: "Подання",
    appeal: "Звернення",
    noEntries: "Файлів нема",
    errorRetrievingRecords: "Помилка при отриманні файлів",
    errorChangingFileType: "Помилка при зміні типу файлу на",
    errorCreatingRecord: "Помилка при створенні файлу",
    errorRetrievingRecord: "Помилка при отриманні файлу",
    errorCheckingId: "Помилка при перевірці id",
    errorDeletingRecord: "Помилка при видаленні файлу",
    errorChangingReceiver: "Помилка при зміні одержувача на",
    errorChangingTitle: "Помилка при зміні назви на",
    errorChangingContent: "Помилка при зміні тексту на",
    enterIdFileToRetrieve: "Введіть id файлу, який ви хочете отримати:",
    enterIdFileToEdit: "Введіть id файлу, який ви хочете змінити:",
    enterIdFileToDelete: "Введіть id файлу, який ви хочете видалити:",
    enterReceiver: "Введіть одержувача:",
    whatDoYouWantToChange: "Що ви хочете змінити?",
    fileType: "Тип файлу",
    receiver: "Одержувача",
    title: "Назву",
    content: "Текст",
    back: "Повернутись",
    selectNewFileType: "Оберіть новий тип файлу:",
    enterNewReceiver: "Введіть нового одержувача:",
    enterNewTitle: "Введіть нову назву:",
    enterNewContent: "Введіть новий текст:",
    enterValidId: "Такого файлу не існує\\. Введіть правильний id одного з цих файлів\\:",
    fileNo: "Файл №",
    wasSuccessfullyDeleted: "було успішно видалено",
    enterTitle: "Введіть тему файлу:",
    enterContent: "Введіть текст файлу:",
    memoCreated: "Файл створено!",
};

const messagesInOneString = Object.values(messages).join("\n");
console.log(messagesInOneString);

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

    await ctx.reply(messages.start);
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

    const keyboard = new InlineKeyboard().text(messages.serviceMemo, "service_memo").text(messages.submission, "submission").text(messages.appeal, "appeal");

    await ctx.reply(messages.selectDocumentType, { reply_markup: keyboard });
    states[chatId].step = "choose_type";
});

bot.command("listfiles", async (ctx) => {
    const chatId = ctx.chat.id;
    clearState(chatId);

    try {
        const response = await fetchAllDocumentsRequest();
        const responseData = response.data;

        if (Array.isArray(responseData) && responseData.length === 0) {
            await ctx.reply(messages.noEntries);
        } else {
            const formattedData = formatFilesList(responseData);

            await ctx.reply(`${formattedData}`, {
                parse_mode: "MarkdownV2",
            });
        }
    } catch (error) {
        await ctx.reply(messages.errorRetrievingRecords);
        await ctx.reply(error);
    }
});

bot.command("getfile", async (ctx) => {
    const chatId = ctx.chat.id;
    clearState(chatId);

    states[chatId].isGetFile = true;
    await ctx.reply(messages.enterIdFileToRetrieve);
});

bot.command("editfile", async (ctx) => {
    const chatId = ctx.chat.id;
    clearState(chatId);

    states[chatId].isEditFile = true;
    await ctx.reply(messages.enterIdFileToEdit);
});

bot.command("deletefile", async (ctx) => {
    const chatId = ctx.chat.id;
    clearState(chatId);

    states[chatId].isDeleteFile = true;
    await ctx.reply(messages.enterIdFileToDelete);
});

bot.callbackQuery("service_memo", async (ctx) => {
    const chatId = ctx.chat.id;

    states[chatId].type = messages.serviceMemo.toUpperCase();
    states[chatId].step = "receiver";
    await ctx.reply(messages.enterReceiver);
});

bot.callbackQuery("submission", async (ctx) => {
    const chatId = ctx.chat.id;

    states[chatId].type = messages.submission.toUpperCase();
    states[chatId].step = "receiver";
    await ctx.reply(messages.enterReceiver);
});

bot.callbackQuery("appeal", async (ctx) => {
    const chatId = ctx.chat.id;

    states[chatId].type = messages.appeal.toUpperCase();
    states[chatId].step = "receiver";
    await ctx.reply(messages.enterReceiver);
});

bot.callbackQuery("back", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text(messages.fileType, "type")
        .text(messages.receiver, "receiver")
        .text(messages.title, "title")
        .text(messages.content, "content");
    await ctx.reply(messages.whatDoYouWantToChange, { reply_markup: keyboard });
});

bot.callbackQuery("type", async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text(messages.serviceMemo, "newServiceMemo")
        .text(messages.submission, "newSubmission")
        .text(messages.appeal, "newAppeal")
        .text(messages.back, "back");
    await ctx.reply(messages.selectNewFileType, { reply_markup: keyboard });
});

bot.callbackQuery("newServiceMemo", async (ctx) => {
    const chatId = ctx.chat.id;

    try {
        const { stringToReply, inputFile } = await changeFileType(states[chatId].editFileId, messages.serviceMemo);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`${messages.errorChangingFileType} «${messages.serviceMemo}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("newSubmission", async (ctx) => {
    const chatId = ctx.chat.id;

    try {
        const { stringToReply, inputFile } = await changeFileType(states[chatId].editFileId, messages.submission);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`${messages.errorChangingFileType} «${messages.submission}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("newAppeal", async (ctx) => {
    const chatId = ctx.chat.id;

    try {
        const { stringToReply, inputFile } = await changeFileType(states[chatId].editFileId, messages.appeal);

        await ctx.reply(stringToReply);
        await ctx.replyWithDocument(inputFile);
    } catch (error) {
        await ctx.reply(`${messages.errorChangingFileType} «${messages.appeal}»`);
        await ctx.reply(error);
    }
});

bot.callbackQuery("receiver", async (ctx) => {
    const chatId = ctx.chat.id;

    await ctx.reply(messages.enterNewReceiver);
    states[chatId].step = "newReceiver";
});

bot.callbackQuery("title", async (ctx) => {
    const chatId = ctx.chat.id;

    await ctx.reply(messages.enterNewTitle);
    states[chatId].step = "newTitle";
});

bot.callbackQuery("content", async (ctx) => {
    const chatId = ctx.chat.id;

    await ctx.reply(messages.enterNewContent);
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
            await ctx.reply(messages.errorCreatingRecord);
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
            await ctx.reply(messages.errorRetrievingRecord);
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
                await ctx.reply(messages.noEntries);
            } else {
                if (!responseData.some((item) => item.id == text)) {
                    const formattedData = formatFilesList(responseData);

                    await ctx.reply(`${messages.enterValidId}\n${formattedData}`, {
                        parse_mode: "MarkdownV2",
                    });

                    states[chatId].isEditFile = true;
                    return;
                }
            }
        } catch (error) {
            await ctx.reply(messages.errorCheckingId);
            await ctx.reply(error);
        }

        const keyboard = new InlineKeyboard()
            .text(messages.fileType, "type")
            .text(messages.receiver, "receiver")
            .text(messages.title, "title")
            .text(messages.content, "content");
        await ctx.reply(messages.whatDoYouWantToChange, { reply_markup: keyboard });
    }

    if (states[chatId].isDeleteFile) {
        states[chatId].isDeleteFile = false;

        try {
            await deleteDocumentRequest(text);

            await ctx.reply(`${messages.fileNo}${text} ${messages.wasSuccessfullyDeleted}`);
        } catch (error) {
            await ctx.reply(messages.errorDeletingRecord);
        }
    }

    if (!states[chatId]) return;

    switch (states[chatId].step) {
        case "receiver":
            states[chatId].receiver = text;
            states[chatId].step = "title";
            await ctx.reply(messages.enterTitle);
            break;
        case "title":
            states[chatId].title = text;
            states[chatId].step = "content";
            await ctx.reply(messages.enterContent);
            break;
        case "content":
            states[chatId].content = text;
            await createDocument(chatId, ctx);
            await ctx.reply(messages.memoCreated);
            clearState(chatId);
            break;
        case "newReceiver":
            clearState(chatId);
            try {
                const { stringToReply, inputFile } = await changeFileProperties(states[chatId].editFileId, { receiver: text });

                await ctx.reply(stringToReply);
                await ctx.replyWithDocument(inputFile);
            } catch (error) {
                await ctx.reply(`${messages.errorChangingReceiver} «${text}»`);
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
                await ctx.reply(`${messages.errorChangingTitle} «${text}»`);
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
                await ctx.reply(`${messages.errorChangingContent} «${text}»`);
                await ctx.reply(error);
            }

            break;
    }
});

bot.start();

bot.catch((err) => {
    console.error(`Error: ${err.error}`);
});
