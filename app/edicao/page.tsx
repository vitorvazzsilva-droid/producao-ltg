import { redirect } from "next/navigation";

// Endereco antigo: a edicao agora e a area Gravados.
export default function Antiga() {
  redirect("/gravados");
}
