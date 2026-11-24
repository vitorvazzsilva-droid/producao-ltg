import { redirect } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";

// Gestao de tarefas: o admin cuida no painel; cada um ve as suas em Minhas metas.
export default async function Tarefas() {
  const eu = await quemSou();
  redirect(eu.papel === "admin" ? "/admin?aba=tarefas" : "/metas");
}
