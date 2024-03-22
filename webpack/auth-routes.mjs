import { tsx } from "@ast-grep/napi";
import { watch } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const pagesDirectory = "src/pages/";
const pageExtensionList = ["tsx", "jsx"];
const ignoredRouteList = ["404", "500", "_app", "_error"];

const routeSymbol = Symbol("route-type");

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
      await this.handleFileEvent(event.name, event.path);
    }
  }
  watchPages() {
    watch(pagesDirectory, { recursive: true }).addListener("change", (_, filename) => {
      if (typeof filename !== "string") return;
      this.handleFileEvent(filename, pagesDirectory).catch(console.error);
    });
  }

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
      if (!contents)
        return {
          // todo - delete route
        };

      return this.isPublicPage(contents)
        .then((isPublic) => {
          console.log(pathname, isPublic);
        })
        .catch((e) => {
          throw Error(`Error while parsing ${pathname} page`, { cause: e });
        });
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

authRoutesPlugin(true).apply();
