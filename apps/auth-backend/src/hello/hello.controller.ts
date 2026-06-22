import { Controller, Get } from "@nestjs/common";

interface Hello {
  service: string;
  status: "ok";
  message: string;
}

/** Placeholder root endpoint — replaced by real routes as the service is built. */
@Controller()
export class HelloController {
  @Get()
  hello(): Hello {
    return { service: "auth-backend", status: "ok", message: "hello from auth-backend" };
  }
}
