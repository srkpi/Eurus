import axios from "axios";

export const api = axios.create({
    baseURL: "https://sr-kpi-api-development.up.railway.app",
});

export async function fetchAllDocumentsRequest() {
    try {
        return await api.get(`/documents/notes`);
    } catch (error) {
        throw new Error("Error fetching documents");
    }
}

export async function fetchDocumentByIdRequest(id) {
    try {
        return await api.get(`/documents/note/${id}`, { responseType: "arraybuffer" });
    } catch (error) {
        throw new Error("Error fetching document by id");
    }
}

export async function createDocumentRequest(data) {
    try {
        return await api.post(`/documents/note`, { ...data }, { responseType: "arraybuffer" });
    } catch (error) {
        throw new Error("Error creating document");
    }
}

export async function updateDocumentRequest(id, updateData) {
    try {
        return await api.patch(`/documents/note`, { id, ...updateData }, { responseType: "arraybuffer" });
    } catch (error) {
        throw new Error("Error updating document");
    }
}

export async function deleteDocumentRequest(id) {
    try {
        return await api.delete(`/documents/note/${id}`);
    } catch (error) {
        throw new Error("Error deleting document");
    }
}
