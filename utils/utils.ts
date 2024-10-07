import { updateDocumentRequest } from "../api/api";
import { InputFile } from "grammy";

export function decodeFilename(contentDisposition) {
    const match = contentDisposition.match(/filename\*?=['"]?([^;]*)['"]?/);
    if (match && match[1]) {
        return decodeURIComponent(match[1].replace(/UTF-8''/, ""));
    }
    return "unknown_filename";
}

export function formatFilesList(data) {
    return data.map((item, index) => `${index + 1}\\) ${item.name.replaceAll(".", "\\.").replaceAll("_", "\\_")} \\- \`${item.id}\``).join("\n");
}

export async function changeFileType(fileId, newType) {
    const response = await updateDocumentRequest(fileId, { type: newType.toUpperCase() });

    const contentDisposition = response.headers["content-disposition"];
    const filename = decodeFilename(contentDisposition);
    const inputFile = new InputFile(Buffer.from(response.data), filename);

    const stringToReply = `Тип файлу було змінено на «${newType}»:`;

    return {
        stringToReply: stringToReply,
        inputFile: inputFile,
    };
}

export async function changeFileProperties(fileId, newProperties) {
    const response = await updateDocumentRequest(fileId, newProperties);

    const contentDisposition = response.headers["content-disposition"];
    const filename = decodeFilename(contentDisposition);
    const inputFile = new InputFile(Buffer.from(response.data), filename);

    const objectToReturn = {
        inputFile: inputFile,
        stringToReply: undefined,
    };

    const receiver = newProperties.receiver;
    const title = newProperties.title;
    const content = newProperties.content;

    if (receiver) {
        objectToReturn.stringToReply = `Одержувача було змінено на «${receiver}»:`;
    }

    if (title) {
        objectToReturn.stringToReply = `Назву було змінено на «${title}»:`;
    }

    if (content) {
        objectToReturn.stringToReply = `Текст було змінено на «${content}»:`;
    }

    return objectToReturn;
}
