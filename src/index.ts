import Bot from "./lib/bot.js";
import getPostText from "./lib/getPostText.js";

const text = await Bot.run(getPostText, { dryRun: process.env.DRY_RUN! === "true" });

console.log(`[${new Date().toISOString()}] Posted: "${text}"`);
