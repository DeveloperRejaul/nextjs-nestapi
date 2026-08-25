import { createApplication, configureAuth } from "nextjs-nestapi";
import { HelloController } from "./features/hello/controller";

configureAuth({
  resolveUser: async (context) => {
    const token = context.request.headers.get("authorization")?.replace("Bearer ", "");
    if (token === "demo-token") return { id: "1", role: "ADMIN" };
    return null;
  },
});

export const app = createApplication({
  controllers: [HelloController],
});
