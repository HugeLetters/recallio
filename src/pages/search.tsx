import { HeaderSearchBar } from "@/components/HeaderSearchBar";
import { HeaderLink, Layout } from "@/components/Layout";
import HomeIcon from "~icons/uil/home-alt";

export default function Page() {
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
          />
        ),
      }}
    >
      <div>SEARCH PAGE</div>
    </Layout>
  );
}
