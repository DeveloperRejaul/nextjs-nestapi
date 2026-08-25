import { createApplication } from "nextjs-nestapi";
import { HelloController } from "./features/hello/controller";

export const app = createApplication({
  controllers: [HelloController],
});
