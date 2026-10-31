import { redirect } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";

// Sem tela de inicio: cada um cai direto na area onde trabalha.
const AREA: Record<string, string> = {
  copy: "/copys",
  gravacao: "/copys?aba=gravar",
  editor: "/gravados",
  trafego: "/editados?aba=aprovados",
  admin: "/copys",
};

export default async function Inicio() {
  const eu = await quemSou();
  redirect(AREA[eu.papel] ?? "/copys");
}
