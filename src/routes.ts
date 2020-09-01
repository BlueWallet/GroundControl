import { GroundController } from "./controller/GroundController";

export const Routes = [
  {
    method: "post",
    route: "/majorTomToGroundControl",
    controller: GroundController,
    action: "majorTomToGroundControl",
  },
  {
    method: "post",
    route: "/unsubscribe",
    controller: GroundController,
    action: "unsubscribe",
  },
  {
    method: "post",
    route: "/getTokenConfiguration",
    controller: GroundController,
    action: "getTokenConfiguration",
  },
  {
    method: "post",
    route: "/setTokenConfiguration",
    controller: GroundController,
    action: "setTokenConfiguration",
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
  {
    method: "get",
    route: "/",
    controller: GroundController,
    action: "ping",
  },
];
