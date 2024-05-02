import type { GetLayout } from ".";

export const getBasicLayout: GetLayout = function (page) {
  return <div className="bg-white">{page}</div>;
};
