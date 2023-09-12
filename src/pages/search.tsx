import { CommondHeader } from "@/components/Header";
import useHeader from "@/hooks/useHeader";

export default function Search() {
  useHeader(() => <CommondHeader title="Search" />, []);

  return <div>SEARCH PAGE</div>;
}
