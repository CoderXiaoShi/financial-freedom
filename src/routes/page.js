import Router from "koa-router";

const router = new Router();

router.get("/", async (ctx) => {
  await ctx.render("dashboard");
});

export default router;
