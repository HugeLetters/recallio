import { HeaderSearchBar, SEARCH_QUERY_KEY } from "@/components/HeaderSearchBar";
import { HeaderLink, Layout } from "@/components/Layout";
import { getQueryParam } from "@/utils";
import { api } from "@/utils/api";
import { useRouter } from "next/router";
import HomeIcon from "~icons/uil/home-alt";

export default function Page() {
  const { query } = useRouter();
  const productListQuery = api.product.getProductSummaryList.useInfiniteQuery(
    {
      limit: 20,
      sort: { by: "rating", desc: true },
      filter: getQueryParam(query[SEARCH_QUERY_KEY]),
    },
    {
      getNextPageParam: (lastPage) => {
        console.log(lastPage.cursor);
        return lastPage.cursor;
      },
    }
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
      <button onClick={() => void productListQuery.fetchNextPage()}>next page</button>
      <div className="flex w-96 flex-col gap-2 p-2">
        {productListQuery.data?.pages?.map(({ page }) =>
          page.map((product) => (
            <div
              key={product.barcode}
              className="rounded-lg bg-app-green p-2 text-white"
            >
              <div>BARCODE - {product.barcode}</div>
              <div>MATCH - {product.matchedName}</div>
              <div>
                NAMES - {product.name.filter((x) => !!x && x !== product.matchedName).join(", ")}
              </div>
              <div>RATING - {product.averageRating}</div>
              <div>REVIEWS - {product.reviewCount}</div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
