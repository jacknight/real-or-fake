import axios from "axios";
import fs from "fs";
import readline from "readline";
import { once } from "events";

export const sendRequest = async (url: string, method: string, opts: any = {}) => {
  let camelToUnderscore = (key: string) => {
    let result = key.replace(/([A-Z])/g, " $1");
    return result.split(" ").join("_").toLowerCase();
  };

  const data: any = {};
  for (const key in opts) {
    data[camelToUnderscore(key)] = opts[key];
  }

  return axios({
    url,
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    data: Object.keys(data).length ? data : "",
    method,
  });
};

export const getRealKickstarter = async () => {
  const responses: any = [];
  // Grab from file of real kickstarters
  const rl = readline.createInterface({
    input: fs.createReadStream("assets/kickstarters-prepared-long-prompt-style.jsonl"),
    crlfDelay: Infinity,
  });

  rl.on("error", (err: any) => console.error(err));

  rl.on("line", (line: any) => {
    if (!line) return;

    // Add completion to responses array.
    let temp = JSON.parse(line).completion;
    responses.push(temp);
  });

  await once(rl, "close");

  return formatResponse(responses[Math.floor(Math.random() * responses.length)]);
};

export const getFakeKickstarter = async () => {
  try {
    const response = await sendRequest("https://api.openai.com/v1/completions", "post", {
      prompt: `**Name**: `,
      model: "curie:ft-yks-smart-bot-2021-08-07-18-00-06",
      maxTokens: 350,
      temperature: 0.8,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      bestOf: 1,
      n: 1,
      stream: false,
      stop: ["###"],
      echo: true,
      user: "realorfakeblueskybot",
    });

    return formatResponse(response.data?.choices?.[0]?.text || "");
  } catch (e: any) {
    console.log(e);
    if (e.response) {
      return null;
    }
  }
};

export const formatResponse = (completion: string) => {
  if (!completion) {
    return null;
  }

  const title = completion.match(/\*\*Name\*\*: (.*)/);
  const category = completion.match(/\*\*Category\*\*: (.*)/);
  const status = completion.match(/\*\*Status\*\*: (.*)/);
  const backers = completion.match(/\*\*Backers\*\*: (.*)/);
  const pledged = completion.match(/\*\*Pledged\*\*: (.*)/);
  const goal = completion.match(/\*\*Goal\*\*: (.*)/);
  const author = completion.match(/\*\*Creator\*\*: (.*)/);
  const description = completion.match(/\*\*Description\*\*: (.*)/);

  if (title && category && status && backers && pledged && goal && author && description) {
    return {
      title: title[1],
      category: category[1],
      status: status[1],
      backers: backers[1],
      pledged: pledged[1],
      goal: goal[1],
      author: author[1],
      description: description[1],
    };
  }

  return null;
};
