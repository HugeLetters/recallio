import { isDev } from "@/utils";

type ElasticOptions = {
  /** The lower the coefficient - the faster value will climb to bound after reaching cutoff. Coefficient less than 0 should not be used. */
  coefficient: number;
  /** Below cutoff function will act as an identity function. */
  cutoff: number;
  /** Value will never be greater than bound. Bound less than to 0 should not be used. */
  bound: number;
};
export function createElasticFunction({ cutoff, bound, coefficient }: ElasticOptions) {
  if (coefficient < 0) {
    if (isDev) {
      console.warn(
        `Elastic coefficient must not be less than 0. Current value is - ${coefficient}`,
      );
    } else {
      coefficient = Math.max(0, coefficient);
    }
  }
  if (bound < 0) {
    if (isDev) {
      console.warn(`Elastic bound must not be less than 0. Current value is - ${bound}`);
    } else {
      bound = Math.max(0, bound);
    }
  }

  const getElasticValue =
    coefficient === 0
      ? (x: number) => cutoff + bound * (1 - Math.exp((cutoff - x) / bound))
      : (x: number) =>
          cutoff + bound * (1 - (1 + (coefficient * (x - cutoff)) / bound) ** (-1 / coefficient));

  return function (value: number) {
    if (value <= cutoff) return value;
    return getElasticValue(value);
  };
}
