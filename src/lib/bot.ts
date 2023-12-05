import { bskyAccount, bskyService } from "./config.js";
import type { AtpAgentLoginOpts, AtpAgentOpts, AppBskyFeedPost } from "@atproto/api";
import atproto from "@atproto/api";
import { ReplyRef } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { NoSuchKey, S3 } from "@aws-sdk/client-s3";

const { BskyAgent, RichText } = atproto;

type BotOptions = {
  service: string | URL;
  dryRun: boolean;
};

type LatestPost = {
  cid: string;
  uri: string;
  isFake: boolean;
};

export default class Bot {
  #agent;

  static defaultOptions: BotOptions = {
    service: bskyService,
    dryRun: false,
  } as const;

  constructor(service: AtpAgentOpts["service"]) {
    this.#agent = new BskyAgent({ service });
  }

  login(loginOpts: AtpAgentLoginOpts) {
    return this.#agent.login(loginOpts);
  }

  async post(
    text: string | (Partial<AppBskyFeedPost.Record> & Omit<AppBskyFeedPost.Record, "createdAt">),
    replyUri?: string,
    replyCid?: string
  ) {
    if (replyUri) {
    }
    if (typeof text === "string") {
      const richText = new RichText({ text });
      await richText.detectFacets(this.#agent);
      const record: Partial<AppBskyFeedPost.Record> & Omit<AppBskyFeedPost.Record, "createdAt"> = {
        text: richText.text,
        facets: richText.facets,
        ...(replyUri &&
          replyCid && {
            reply: {
              root: { uri: replyUri, cid: replyCid },
              parent: { uri: replyUri, cid: replyCid },
            },
          }),
      };
      return this.#agent.post(record);
    } else {
      return this.#agent.post(text);
    }
  }

  static async run(
    getPostText: () => Promise<{ post: string; isFake: boolean }>,
    botOptions?: Partial<BotOptions>
  ) {
    const { service, dryRun } = botOptions
      ? Object.assign({}, this.defaultOptions, botOptions)
      : this.defaultOptions;
    const bot = new Bot(service);
    const response = await bot.login(bskyAccount);
    const handle = response.data.handle;
    const { post, isFake } = await getPostText();

    const s3 = new S3({
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
      },

      region: process.env.AWS_S3_REGION!,
    });

    const s3obj = await s3
      .getObject({
        Bucket: process.env.AWS_S3_LATEST_POST_BUCKET!,
        Key: process.env.AWS_S3_LATEST_POST_KEY!,
      })
      .catch((e: any) => {
        if (e.Code && e.Code !== "NoSuchKey") {
          throw e;
        }
      });

    if (s3obj?.Body) {
      const latestPost: LatestPost = JSON.parse(await s3obj.Body.transformToString());
      const { uri, cid, isFake } = latestPost;
      if (uri && cid) {
        await bot.post(`This one was ${isFake ? "Fake" : "Real"}`, uri, cid);
      }
    }

    if (!dryRun && post !== "") {
      const { uri, cid } = await bot.post(post);

      await s3.putObject({
        Bucket: process.env.AWS_S3_LATEST_POST_BUCKET!,
        Key: process.env.AWS_S3_LATEST_POST_KEY!,
        Body: JSON.stringify({
          uri,
          cid,
          isFake,
        }),
        ContentType: "application/json",
      });
    }

    return post;
  }
}
