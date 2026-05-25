import Router from "koa-router";

const router = new Router();
const basePath = process.env.BASE_PATH || "";

router.get("/", async (ctx) => {
  await ctx.render("dashboard", { basePath });
});

export default router;
