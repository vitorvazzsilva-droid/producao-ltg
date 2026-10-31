import { redirect } from "next/navigation";

// Endereco antigo: a gravacao agora fica dentro de Copys.
export default function Antiga() {
  redirect("/copys?aba=gravar");
}
