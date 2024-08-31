import { bot } from "../src/bot";

const webhook = `https://eurus-beta.vercel.app/api/webhook`;

void bot.api.setWebhook(webhook);
