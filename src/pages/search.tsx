import { Layout } from "@/components/Layout";
import { Card, InfiniteScroll, NoResults } from "@/components/List";
import { HeaderSearchBar, SEARCH_QUERY_KEY, SortDialog, useParseSort } from "@/components/Search";
import { Star } from "@/components/UI";
import { fetchNextPage, getQueryParam } from "@/utils";
import { api, type RouterInputs } from "@/utils/api";
import type { NextPageWithLayout } from "@/utils/type";
import { useRouter } from "next/router";

const Page: NextPageWithLayout = function () {
  const { query, isReady } = useRouter();
  const sortParam = useParseSort(sortOptionList);
  const sort = parseSortParam(sortParam);
  const filter = getQueryParam(query[SEARCH_QUERY_KEY]);

  const productListQuery = api.product.getProductSummaryList.useInfiniteQuery(
    { limit: 20, sort, filter },
    { getNextPageParam: (lastPage) => lastPage.cursor, enabled: isReady },
  );

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between px-2">
        <span className="text-lg">Goods</span>
        <SortDialog optionList={sortOptionList} />
      </div>
      <div className="flex grow flex-col gap-2 pb-4">
        {productListQuery.isSuccess ? (
          <InfiniteScroll
            pages={productListQuery.data.pages}
            getPageValues={(page) => page.page}
            getKey={(value) => value.barcode}
            getNextPage={fetchNextPage(productListQuery)}
            fallback={<NoResults />}
          >
            {(value) => {
              const match = filter ? value.matchedName : value.names[0] ?? value.matchedName;

              return (
                <Card
                  href={{ pathname: "/product/[id]", query: { id: value.barcode } }}
                  aria-label={`Go to product ${value.barcode} page`}
                  image={value.image}
                  label={match}
                  subtext={value.names.filter(
                    (x): x is NonNullable<typeof x> => !!x && x !== match,
                  )}
                >
                  <div className="flex h-5 items-center gap-0.5">
                    <Star highlight />
                    <span className="text-sm">{value.averageRating.toFixed(1)}</span>
                    <span className="text-xs text-neutral-400">
                      ({value.reviewCount.toFixed(0)})
                    </span>
                  </div>
                </Card>
              );
            }}
          </InfiniteScroll>
        ) : (
          "Loading..."
        )}
      </div>
    </div>
  );
};

Page.getLayout = (page) => {
  return <Layout header={{ header: <HeaderSearchBar title="Search" /> }}>{page}</Layout>;
};
export default Page;

const sortOptionList = ["most popular", "least popular", "best rated", "worst rated"] as const;
type SortOption = (typeof sortOptionList)[number];
type SortQuery = RouterInputs["product"]["getProductSummaryList"]["sort"];
function parseSortParam(param: SortOption): SortQuery {
  switch (param) {
    case "most popular":
      return { by: "reviews", desc: true };
    case "least popular":
      return { by: "reviews", desc: false };
    case "best rated":
      return { by: "rating", desc: true };
    case "worst rated":
      return { by: "rating", desc: false };
    default:
      const x: never = param;
      return x;
  }
}
