import { redirect } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";
import { ofertas, producoes, tags, usuarios } from "@/lib/dados";
import { nomeCurto } from "@/lib/producao-base";
import { NovaForm } from "./nova-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova produção" };

export default async function Nova() {
  const eu = await quemSou();
  if (eu.papel !== "admin" && eu.papel !== "copy") redirect("/");
  const [gente, ofs, tgs, bases] = await Promise.all([usuarios(true), ofertas(), tags(), producoes({ status: ["no_ar", "aprovado", "revisao"] })]);
  const pessoa = (papel: string) =>
    gente.filter((g) => g.papel === papel).map((g) => ({ id: g.id, nome: g.nome, sigla: (g.sigla || g.nome.slice(0, 4)).toUpperCase() }));
  return (
    <div className="pagina form-pag">
      <div className="cab">
        <div>
          <h1>Nova produção</h1>
          <p className="sub">O nome canônico e o sequencial são gerados. Você escolhe o expert, e a produção nasce pronta pra esteira.</p>
        </div>
      </div>
      <NovaForm
        eu={{ id: eu.id, papel: eu.papel }}
        experts={pessoa("gravacao")}
        copies={[...pessoa("copy"), ...(eu.papel === "admin" ? pessoa("admin") : [])]}
        editores={pessoa("editor")}
        ofertas={ofs}
        tags={tgs}
        bases={bases
          .sort((a, b) => (a.status === "no_ar" ? 0 : 1) - (b.status === "no_ar" ? 0 : 1))
          .map((b) => ({ id: b.id, oferta_id: b.oferta_id, nome: nomeCurto(b), noAr: b.status === "no_ar", hook: b.hook }))}
      />
    </div>
  );
}
