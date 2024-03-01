import { InfiniteScroll } from "@/components/list/infinite-scroll";
import { Card, NoResults } from "@/components/list/product";
import { Spinner } from "@/components/loading/spinner";
import { HeaderSearchBar, useSearchQuery } from "@/components/search/search";
import { SortDialog, useSortQuery } from "@/components/search/sort";
import { Star } from "@/components/ui/star";
import { Layout } from "@/layout";
import { fetchNextPage } from "@/utils";
import type { RouterInputs } from "@/utils/api";
import { api } from "@/utils/api";
import type { NextPageWithLayout } from "@/utils/type";
import { Toolbar } from "@radix-ui/react-toolbar";
import { useRouter } from "next/router";

const Page: NextPageWithLayout = function () {
  const { isReady } = useRouter();
  const sortParam = useSortQuery(sortOptionList);
  const sort = parseSortParam(sortParam);
  const filter = useSearchQuery();

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
      <Toolbar
        loop={false}
        orientation="vertical"
        className="flex grow flex-col gap-2 pb-4"
      >
        {productListQuery.isSuccess ? (
          <InfiniteScroll
            pages={productListQuery.data.pages}
            getPageValues={(page) => page.page}
            getKey={(value) => value.barcode}
            getNextPage={fetchNextPage(productListQuery)}
            fallback={<NoResults />}
            spinner={productListQuery.isFetching ? <Spinner className="h-16" /> : null}
          >
            {(value) => {
              const match = filter ? value.matchedName : value.names[0] ?? value.matchedName;

              return (
                <Card
                  href={{ pathname: "/product/[id]", query: { id: value.barcode } }}
                  aria-label={`Go to product ${value.barcode} page`}
                  image={value.image}
                  label={match}
                  subtext={value.names.filter((x) => !!x && x !== match)}
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
      </Toolbar>
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
