import useHeader from "@/hooks/useHeader";

export default function Page() {
  useHeader(() => ({ title: "Search" }), []);

  return <div>SEARCH PAGE</div>;
}
