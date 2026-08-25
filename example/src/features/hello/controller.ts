import {
  Controller,
  Get,
  Post,
  Body,
  ApiTags,
  ApiOperation,
  ApiResponse,
  type RouteContext,
} from "nextjs-nestapi";
import { CreateHelloDto } from "./dto";

@ApiTags("Hello")
@Controller("/hello")
export class HelloController {
  @ApiOperation({ summary: "List a hello message" })
  @Get("")
  list() {
    return { message: "hello world" };
  }

  @ApiOperation({ summary: "Get one hello by id" })
  @Get("/:id")
  getOne(context: RouteContext) {
    return { id: context.params.id };
  }

  @ApiOperation({ summary: "Create a hello" })
  @ApiResponse({ status: 200, description: "Created" })
  @Post("")
  create(@Body(CreateHelloDto) dto: CreateHelloDto) {
    return { created: dto };
  }
}
