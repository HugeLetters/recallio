import { parse } from "node-html-parser";

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
          ?.lastChild.innerText,
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

const scrapers = [UPCDatabaseCom, UPCDatabaseOrg, Brocade, GoUPC];
export default function getScrapedProducts(code: string) {
  return Promise.allSettled(scrapers.map((query) => query(code))).then((results) =>
    results.reduce<string[]>((arr, el) => {
      if (el.status === "fulfilled" && el.value) {
        arr.push(el.value);
      }
      return arr;
    }, []),
  );
}
