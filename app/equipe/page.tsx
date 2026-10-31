import { redirect } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";
import { usuarios, quando } from "@/lib/dados";
import { PAPEIS } from "@/lib/fluxo";
import { mudarPapel } from "../acoes";
import { NovoMembro, NovaSenha, Acesso } from "./membro";
import { iniciais } from "@/lib/iniciais";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipe" };

export default async function Equipe() {
  const eu = await quemSou();
  if (eu.papel !== "admin") redirect("/");
  const gente = await usuarios();

  return (
    <div className="pagina estreita">
      <div className="cab">
        <div>
          <h1>Equipe</h1>
          <p className="sub">Cada pessoa entra com o próprio usuário. A senha aparece uma vez só — mande no WhatsApp da pessoa.</p>
        </div>
      </div>

      <NovoMembro />

      <div className="bloco">
        <ul className="membros">
          {gente.map((u) => (
            <li key={u.id} className={u.ativo ? "" : "inativo"}>
              <span className="avatar">{iniciais(u.nome)}</span>
              <div className="membro-nome">
                <b>{u.nome}</b>
                <span className="meta">
                  {!u.ativo && <b className="vermelho">sem acesso · </b>}
                  usuário <span className="mono">@{u.login}</span> · desde {quando(u.criado_em).split(" ·")[0]}
                </span>
              </div>
              {u.id === eu.id ? (
                <span className="pill st-aprovado">{PAPEIS[u.papel as keyof typeof PAPEIS]} (você)</span>
              ) : (
                <>
                  <form action={mudarPapel} className="inline">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="papel" defaultValue={u.papel} aria-label="Função">
                      {Object.entries(PAPEIS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button className="lk">salvar</button>
                  </form>
                  <NovaSenha id={u.id} />
                  <Acesso id={u.id} ativo={!!u.ativo} />
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
