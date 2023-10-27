import { HeaderLink, Layout } from "@/components/Layout";
import { Card, InfiniteScroll } from "@/components/List";
import { HeaderSearchBar, SEARCH_QUERY_KEY, SortDialog, useParseSort } from "@/components/Search";
import { Star } from "@/components/UI";
import { getQueryParam } from "@/utils";
import { api, type RouterInputs } from "@/utils/api";
import { useRouter } from "next/router";
import HomeIcon from "~icons/uil/home-alt";

export default function Page() {
  const { query } = useRouter();
  const sortParam = useParseSort(sortOptionList);
  const sort = parseSortParam(sortParam);
  const filter = getQueryParam(query[SEARCH_QUERY_KEY]);

  const productListQuery = api.product.getProductSummaryList.useInfiniteQuery(
    { limit: 20, sort, filter },
    { getNextPageParam: (lastPage) => lastPage.cursor }
  );

  return (
    <Layout
      header={{
        header: (
          <HeaderSearchBar
            right={
              <HeaderLink
                Icon={HomeIcon}
                href="/"
              />
            }
            title="Search"
          />
        ),
      }}
    >
      <div className="flex w-full flex-col gap-2 p-4">
        <div className="flex items-center justify-between p-2">
          <span className="text-lg">Goods</span>
          <SortDialog optionList={sortOptionList} />
        </div>
        {productListQuery.isSuccess ? (
          <InfiniteScroll
            pages={productListQuery.data?.pages}
            getPageValues={(page) => page.page}
            getKey={(value) => value.barcode}
            getNextPage={() => {
              !productListQuery.isFetching && productListQuery.fetchNextPage().catch(console.error);
            }}
          >
            {(value) => {
              const match = filter ? value.matchedName : value.name[0] ?? value.matchedName;

              return (
                <Card
                  // todo - this should link to product page
                  href={"/"}
                  aria-label={`Go to product ${value.barcode} page`}
                  image={value.image}
                  label={match}
                  subtext={value.name.filter((x): x is NonNullable<typeof x> => !!x && x !== match)}
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
    </Layout>
  );
}

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
