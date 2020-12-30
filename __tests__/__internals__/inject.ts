import foxifyInject, { InjectResultI, OptionsI } from "@foxify/inject";
import Router from "../../src";
import { Request, Response } from "@foxify/http";

export default function inject(
  router: Router,
  options: string | OptionsI,
): Promise<InjectResultI<Request, Response>> {
  if (typeof options === "string") {
    options = {
      url: options,
    };
  }

  return foxifyInject<Request, Response>(
    (req, res) => {
      // will be populated by foxify
      res.stringify = {};
      res.next = (err?) => {
        if (err) throw err;
      };

      return router.lookup(req, res);
    },
    { ...options, Request, Response },
  );
}
