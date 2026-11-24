import { redirect } from "next/navigation";

// Tela antiga: agora mora em /esteira.
export default function Antiga() {
  redirect("/esteira");
}
