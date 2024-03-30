import { isDev } from "@/utils";

type ElasticOptions = {
  /** The lower the coefficient - the faster value will climb to stretch after reaching cutoff. Coefficient less than 0 should not be used. */
  coefficient: number;
  /** Below cutoff function will act as an identity function. */
  cutoff: number;
  /** Value will never be greater than stretch + cutoff. Stretch less than to 0 should not be used. */
  stretch: number;
};
export function createElasticStretchFunction({ cutoff, stretch, coefficient }: ElasticOptions) {
  if (coefficient < 0) {
    if (isDev) {
      console.warn(
        `Elastic coefficient must not be less than 0. Current value is - ${coefficient}`,
      );
    } else {
      coefficient = Math.max(0, coefficient);
    }
  }
  if (stretch < 0) {
    if (isDev) {
      console.warn(`Elastic bound must not be less than 0. Current value is - ${stretch}`);
    } else {
      stretch = Math.max(0, stretch);
    }
  }

  const getElasticValue =
    coefficient === 0
      ? (x: number) => cutoff + stretch * (1 - Math.exp((cutoff - x) / stretch))
      : (x: number) =>
          cutoff +
          stretch * (1 - (1 + (coefficient * (x - cutoff)) / stretch) ** (-1 / coefficient));

  return function (value: number) {
    if (value <= cutoff) return value;
    return getElasticValue(value);
  };
}
