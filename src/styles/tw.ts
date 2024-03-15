import { filterMap } from "@/utils/array/filter";

type Falsy = undefined | null | false;
type ClassGroup = Falsy | string | Array<ClassGroup>;
export function tw(...classGroup: ClassGroup[]): string {
  return filterMap(
    classGroup,
    (x, bad) => (!!x ? x : bad),
    (classGroup) => (Array.isArray(classGroup) ? tw(...classGroup) : classGroup),
  ).join(" ");
}
