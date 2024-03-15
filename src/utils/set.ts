export function setIntersection<T>(a: Set<T>, b: Set<T>) {
  const intersection = new Set<T>();
  for (const value of a) {
    if (b.has(value)) intersection.add(value);
  }
  return intersection;
}

export function isSetEqual<T>(a: Set<T>, b: Set<T>) {
  const intersection = setIntersection(a, b);
  return intersection.size === a.size && intersection.size === b.size;
}
