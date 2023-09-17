import { CommondHeader } from "@/components/Header";
import useHeader from "@/hooks/useHeader";

export default function ProfileEdit() {
  useHeader(() => <CommondHeader title="Editing" />, []);

  return <div>profile edit</div>;
}
