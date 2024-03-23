import { tsx } from "@ast-grep/napi";
import { watch } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format } from "prettier";
import prettierConfig from "../prettier.config.cjs";

const pagesDirectory = "src/pages/";
const pageExtensionList = ["tsx", "jsx"];
const ignoredRouteList = ["404", "500", "_app", "_error"];

/** @type {Array<import("./auth-routes.types").RouteType>} */
const routeTypeList = ["public", "private"];
const routeEndSymbolName = "routeEnd";
const dynamicSymbolName = "dynamic";
const specialSymbolRegex = new RegExp(
  `"(\\[(?:${dynamicSymbolName}|${routeEndSymbolName})\\])"`,
  "g",
);

async function readPages() {
  const pages = await readdir(pagesDirectory, { recursive: true, withFileTypes: true });
  return Promise.all(
    pages.map((event) => {
      if (!event.isFile()) return;
      return handleFileEvent(event.name, event.path).catch(console.error);
    }),
  );
}
function watchPages() {
  watch(pagesDirectory, { recursive: true }).addListener("change", (_, filename) => {
    if (typeof filename !== "string") return;
    handleFileEvent(filename, pagesDirectory).catch(console.error);
  });
}

/**
 * Indicates whether a route is public or not
 * @type {Map<string,boolean>}
 * */
const routeInfo = new Map();

/**
 * @param {string} filename
 * @param {string} directory
 */
async function handleFileEvent(filename, directory) {
  if (!pageExtensionList.some((extension) => filename.endsWith(`.${extension}`))) return;

  const filepath = resolve(`${directory}/${filename}`);
  const pathname = getPathname(filepath);
  if (ignoredRouteList.includes(pathname)) return;

  return readFileMaybe(filepath).then((contents) => {
    if (!contents) {
      return updateRouteInfo(pathname, null);
    }

    return isPublicPage(contents)
      .then((isPublic) => updateRouteInfo(pathname, isPublic))
      .catch((e) => {
        return updateRouteInfo(pathname, null).then(() => {
          throw Error(`Error while parsing ${pathname} page`, { cause: e });
        });
      });
  });
}

let cancelTrieUpdate = () => void 0;
/**
 * @param {string} pathname
 * @param {boolean|null} value
 * @returns {Promise<void>}
 */
async function updateRouteInfo(pathname, value) {
  const prevValue = routeInfo.get(pathname) ?? null;
  if (value === null) {
    routeInfo.delete(pathname);
  } else {
    routeInfo.set(pathname, value);
  }
  if (routeInfo.get(pathname) === prevValue) return;

  cancelTrieUpdate();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      createRouteTrie()
        .then((trie) => {
          const stringified = stringifyRouteTrie(trie);
          const fileContents = createRouteFile(stringified);
          return format(fileContents, { ...prettierConfig, parser: "typescript" });
        })
        .then((contents) => writeFile("src/router/matcher.ts", contents))
        .then(resolve)
        .catch(reject);
    }, 5000);
    cancelTrieUpdate = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
}

/**
 * @param {string} filepath
 */
function readFileMaybe(filepath) {
  return readFile(filepath, "utf-8").catch(() => null);
}

/**
 * @param {string} contents
 * @returns {Promise<boolean>}
 */
function isPublicPage(contents) {
  return tsx.parseAsync(contents).then((sg) => {
    const tree = sg.root();
    const defaultExport = tree.find("export default $A;")?.getMatch("A")?.text();
    if (!defaultExport) return Promise.reject("Page has no default export");
    return !!tree.find(`${defaultExport}.isPublic=true`);
  });
}

/**
 * @param {string} filepath
 */
function getPathname(filepath) {
  const pathnameFile = filepath.split(pagesDirectory).at(-1);
  if (!pathnameFile) throw "todo";
  const pathname = pathnameFile.split(".").at(0);
  if (!pathname) throw "todo";
  return pathname.replace(/\/index$/, "");
}

async function createRouteTrie() {
  /** @type {import("./auth-routes.types").RouteMatcherTrie} */
  const trie = {};
  for (const [route, isPublic] of routeInfo) {
    const chunks = route.split("/");
    let node = trie;
    for (const chunk of chunks) {
      const chunkName =
        chunk.startsWith("[") && chunk.endsWith("]") ? `[${dynamicSymbolName}]` : chunk;

      node[chunkName] ??= {};
      const child = node[chunkName];
      if (typeof child !== "object") {
        return Promise.reject(`Path ${route} has invalid segment ${chunk}`);
      }
      node = child;
    }
    node[`[${routeEndSymbolName}]`] = isPublic ? "public" : "private";
  }
  return trie;
}

/**
 * @param {import("./auth-routes.types").RouteMatcherTrie} trie
 */
function stringifyRouteTrie(trie) {
  return JSON.stringify(trie).replaceAll(specialSymbolRegex, "$1");
}

/**
 * @param {string} data
 */
function createRouteFile(data) {
  return `
export type RouteType = ${routeTypeList.map((x) => `"${x}"`).join("|")};
type RouteEnd<Marker extends PropertyKey> = { [K in Marker]?: RouteType };
type RouteMatcher<EndMarker extends symbol, Dynamic extends symbol> = RouteEnd<EndMarker> & {
  [chunk in string | Dynamic]?: RouteMatcher<EndMarker, Dynamic>;
};
export const ${routeEndSymbolName}: unique symbol = Symbol("route-end");
export const ${dynamicSymbolName}: unique symbol = Symbol("dynamic");
export const routeMatcher: RouteMatcher<typeof ${routeEndSymbolName}, typeof ${dynamicSymbolName}> = ${data};
    `;
}

let initialized = false;
/**
 * @param {boolean} watch
 */
export function authRoutesPlugin(watch) {
  return {
    apply() {
      if (initialized) return;
      initialized = true;
      return readPages().then(() => {
        if (!watch) return;
        return watchPages();
      });
    },
  };
}
