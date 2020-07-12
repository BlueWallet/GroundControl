import {UserController} from "./controller/UserController";
import {GroundControl} from "./controller/GroundControl";

export const Routes = [{
    method: "get",
    route: "/users",
    controller: UserController,
    action: "all"
}, {
    method: "get",
    route: "/users/:id",
    controller: UserController,
    action: "one"
}, {
    method: "post",
    route: "/users",
    controller: UserController,
    action: "save"
}, {
    method: "delete",
    route: "/users/:id",
    controller: UserController,
    action: "remove"
}


    ,{
        method: "post",
        route: "/majorTomToGroundControl",
        controller: GroundControl,
        action: "majorTomToGroundControl"
    },{
        method: "post",
        route: "/lightningInvoiceGotSettled",
        controller: GroundControl,
        action: "lightningInvoiceGotSettled"
    },{
        method: "get",
        route: "/ping",
        controller: GroundControl,
        action: "ping"
    }


];