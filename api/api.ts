import axios from "axios";

export const api = axios.create({
    baseURL: "https://sr-kpi-api-development.up.railway.app",
});
