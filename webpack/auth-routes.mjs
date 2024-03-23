import { tsx } from "@ast-grep/napi";
import { watch } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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

class AuthRoutesPlugin {
  /**
   * @param {boolean} watch
   */
  constructor(watch) {
    void this.readPages().then(() => {
      if (!watch) return;
      this.watchPages();
    });
  }

  async readPages() {
    const pages = await readdir(pagesDirectory, { recursive: true, withFileTypes: true });
    for (const event of pages) {
      if (!event.isFile()) continue;
      await this.handleFileEvent(event.name, event.path).catch(console.error);
    }
  }
  watchPages() {
    watch(pagesDirectory, { recursive: true }).addListener("change", (_, filename) => {
      if (typeof filename !== "string") return;
      this.handleFileEvent(filename, pagesDirectory).catch(console.error);
    });
  }

  /**
   * Indicates whether a route is public or not
   * @type {Map<string,boolean>}
   * */
  routeInfo = new Map();

  /** @type {ReturnType<typeof setTimeout>|undefined} */
  fileWriteTimeout = undefined;
  /**
   * @param {string} filename
   * @param {string} directory
   */
  async handleFileEvent(filename, directory) {
    if (!pageExtensionList.some((extension) => filename.endsWith(`.${extension}`))) return;

    const filepath = resolve(`${directory}/${filename}`);
    const pathname = this.getPathname(filepath);
    if (ignoredRouteList.includes(pathname)) return;

    return this.readFile(filepath).then((contents) => {
      if (!contents) {
        return this.updateRouteInfo(pathname, null);
      }

      return this.isPublicPage(contents)
        .then((isPublic) => this.updateRouteInfo(pathname, isPublic))
        .catch((e) => {
          return this.updateRouteInfo(pathname, null).then(() => {
            throw Error(`Error while parsing ${pathname} page`, { cause: e });
          });
        });
    });
  }

  /**
   * @param {string} pathname
   * @param {boolean|null} value
   */
  async updateRouteInfo(pathname, value) {
    const prevValue = this.routeInfo.get(pathname) ?? null;
    if (value === null) {
      this.routeInfo.delete(pathname);
    } else {
      this.routeInfo.set(pathname, value);
    }
    if (this.routeInfo.get(pathname) === prevValue) return;

    return this.createRouteTrie().then((trie) => {
      const stringified = this.stringifyRouteTrie(trie);
      const fileContents = this.createRouteFile(stringified);
      clearTimeout(this.fileWriteTimeout);
      this.fileWriteTimeout = setTimeout(() => {
        writeFile("src/router/matcher.ts", fileContents).catch(console.error);
      }, 1000);
    });
  }

  /**
   * @param {string} filepath
   */
  readFile(filepath) {
    return readFile(filepath, "utf-8").catch(() => null);
  }

  /**
   * @param {string} contents
   * @returns {Promise<boolean>}
   */
  isPublicPage(contents) {
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
  getPathname(filepath) {
    const pathnameFile = filepath.split(pagesDirectory).at(-1);
    if (!pathnameFile) throw "todo";
    const pathname = pathnameFile.split(".").at(0);
    if (!pathname) throw "todo";
    return pathname.replace(/\/index$/, "");
  }

  async createRouteTrie() {
    /** @type {import("./auth-routes.types").RouteMatcherTrie} */
    const trie = {};
    for (const [route, isPublic] of this.routeInfo) {
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
  stringifyRouteTrie(trie) {
    return JSON.stringify(trie).replaceAll(specialSymbolRegex, "$1");
  }

  /**
   * @param {string} data
   */
  createRouteFile(data) {
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
}

/** @type {AuthRoutesPlugin|undefined} */
let watcher = undefined;
/**
 * @param {boolean} watch
 */
export function authRoutesPlugin(watch) {
  return {
    apply() {
      watcher ??= new AuthRoutesPlugin(watch);
      return watcher;
    },
  };
}
