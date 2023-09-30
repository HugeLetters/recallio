import useHeader from "@/hooks/useHeader";

export default function Search() {
  useHeader(() => ({ title: "Search" }), []);

  return <div>SEARCH PAGE</div>;
}
