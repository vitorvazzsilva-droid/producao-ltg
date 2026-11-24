import { redirect } from "next/navigation";

// Tela antiga: agora mora em /copy.
export default function Antiga() {
  redirect("/copy");
}
