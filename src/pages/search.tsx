import { HeaderLink, Layout } from "@/components/Layout";
import { HeaderSearchBar, SEARCH_QUERY_KEY, SortDialog, useParseSort } from "@/components/Search";
import { Clickable } from "@/components/UI";
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
      <div className="flex w-96 flex-col gap-2 p-2">
        <Clickable
          variant="ghost"
          onClick={() => void productListQuery.fetchNextPage()}
        >
          next page
        </Clickable>
        <SortDialog optionList={sortOptionList} />
        {productListQuery.data?.pages?.map(({ page }) =>
          page.map((product) => {
            const match = filter ? product.matchedName : product.name[0];
            return (
              <div
                key={product.barcode}
                className="rounded-lg bg-app-green p-2 text-white"
              >
                <div>BARCODE - {product.barcode}</div>
                <div>MATCH - {match}</div>
                <div>NAMES - {product.name.filter((x) => !!x && x !== match).join(", ")}</div>
                <div>RATING - {product.averageRating}</div>
                <div>REVIEWS - {product.reviewCount}</div>
              </div>
            );
          })
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
