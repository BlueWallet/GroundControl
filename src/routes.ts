import { UserController } from "./controller/UserController";
import { GroundController } from "./controller/GroundController";

export const Routes = [
  {
    method: "get",
    route: "/users",
    controller: UserController,
    action: "all",
  },
  {
    method: "get",
    route: "/users/:id",
    controller: UserController,
    action: "one",
  },
  {
    method: "post",
    route: "/users",
    controller: UserController,
    action: "save",
  },
  {
    method: "delete",
    route: "/users/:id",
    controller: UserController,
    action: "remove",
  },

  {
    method: "post",
    route: "/majorTomToGroundControl",
    controller: GroundController,
    action: "majorTomToGroundControl",
  },
  {
    method: "post",
    route: "/lightningInvoiceGotSettled",
    controller: GroundController,
    action: "lightningInvoiceGotSettled",
  },
  {
    method: "get",
    route: "/ping",
    controller: GroundController,
    action: "ping",
  },
];
