import { filterMap } from "@/utils/array/filter";
import { hasTruthyProperty } from "@/utils/object";
import type { Nullish } from "@/utils/type";
import { parse } from "node-html-parser";
import { updateProductNameScrapperCounter } from "./cache";

function UPCDatabaseOrg(code: string) {
  return fetch(`https://upcdatabase.org/code/${code}`)
    .then(parseHTMLResponse)
    .then((doc) => doc.querySelector("table.table h3")?.innerText);
}

function UPCDatabaseCom(code: string) {
  return fetch(`https://www.upcdatabase.com/item/${code}`)
    .then(parseHTMLResponse)
    .then(
      (doc) =>
        doc.querySelectorAll("table.data tr").find((el) => el.innerText.includes("Description"))
          ?.lastChild?.innerText,
    );
}

function Brocade(code: string) {
  return fetch(`https://www.brocade.io/products/${code}`)
    .then(parseHTMLResponse)
    .then((doc) => doc.querySelector("h3.text-lg.font-medium.leading-6.text-gray-900")?.innerText);
}

function GoUPC(code: string) {
  return fetch(`https://go-upc.com/search?q=${code}`)
    .then(parseHTMLResponse)
    .then((doc) => doc.querySelector("h1.product-name")?.innerText);
}

function parseHTMLResponse(response: Response) {
  return response.text().then(parse);
}

type Scapper = {
  name: string;
  fetcher: (barcode: string) => Promise<Nullish<string>>;
};
const scrapers: Array<Scapper> = [
  { name: "https://upcdatabase.org", fetcher: UPCDatabaseCom },
  { name: "https://www.upcdatabase.com", fetcher: UPCDatabaseOrg },
  { name: "https://www.brocade.io", fetcher: Brocade },
  { name: "https://go-upc.com", fetcher: GoUPC },
];

export async function getScrapedProducts(code: string) {
  const results = await Promise.allSettled(
    scrapers.map((query) =>
      timedPromise(query.fetcher(code), 5000).then((name) => ({ scrapper: query.name, name })),
    ),
  );

  const successful = filterMap(
    results,
    (result, bad) =>
      result.status === "fulfilled" && hasTruthyProperty(result, "value") ? result : bad,
    (result) => result.value,
  );

  for (const { scrapper } of successful) {
    updateProductNameScrapperCounter(scrapper).catch(console.error);
  }

  return filterMap(
    successful,
    (result, bad) => (hasTruthyProperty(result, "name") ? result : bad),
    (result) => result.name,
  );
}

function timedPromise<T>(promise: Promise<T>, timeout: number) {
  return new Promise<T>((resolve, reject) => {
    promise.then(resolve).catch(reject);
    setTimeout(() => reject(Error("Promise timed out")), timeout);
  });
}
