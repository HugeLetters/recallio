export type Nullish<T = never> = T | null | undefined;

export type Equals<A, B> = [A, B] extends [B, A] ? true : false;
export type Assert<T extends true> = T;

export type StrictExtract<T, U extends Partial<T>> = Extract<T, U>;
export type StrictExclude<T, U extends Partial<T>> = Exclude<T, U>;
