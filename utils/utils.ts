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

    if (newProperties.receiver) {
        objectToReturn.stringToReply = `Одержувача було змінено на «${newProperties.receiver}»:`;
    }

    if (newProperties.title) {
        objectToReturn.stringToReply = `Назву було змінено на «${newProperties.title}»:`;
    }

    if (newProperties.content) {
        objectToReturn.stringToReply = `Текст було змінено на «${newProperties.content}»:`;
    }

    return objectToReturn;
}
