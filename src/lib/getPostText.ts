import { getFakeKickstarter, getRealKickstarter } from "./util.js";

const getPostText = async () => {
  const isFake: boolean = Math.floor(Math.random() * 2) == 1;
  const ks = isFake ? await getFakeKickstarter() : await getRealKickstarter();

  if (!ks) return { post: "", isFake: false };

  const post = `${ks.title}\n\n${ks.description}\n\nCreated by ${ks.author}\n${ks.backers} backer${
    ks.backers == "1" ? "" : "s"
  }, $${ks.pledged} of $${ks.goal} (${ks.status})`;

  return { post, isFake };
};

export default getPostText;
