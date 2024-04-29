import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("request!");
  console.log(req.body);
  res.status(200).json("okie");
}
