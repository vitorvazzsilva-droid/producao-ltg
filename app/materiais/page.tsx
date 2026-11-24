import Link from "next/link";
import { eu as quemSou } from "@/lib/sessao";
import { db } from "@/lib/db";
import { ofertas, tags, usuarios } from "@/lib/dados";
import { criarOferta, criarTag } from "../acoes";
import { Form } from "../form";
import { Chip } from "../card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Materiais" };

export default async function Materiais({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const eu = await quemSou();
  const { aba: a } = await searchParams;
  const aba = a === "tags" || a === "links" ? a : "ofertas";
  const pode = eu.papel === "admin" || eu.papel === "copy";
  const [ofs, tgs, gente, links] = await Promise.all([
    ofertas(),
    tags(),
    usuarios(true),
    db.execute(
      `SELECT lote, MIN(codigo) AS de, MAX(codigo) AS ate, COUNT(*) AS n, MAX(doc_url) AS doc, MAX(pasta_bruto) AS bruto, MAX(pasta_entrega) AS entrega
       FROM producoes WHERE lote IS NOT NULL AND (doc_url IS NOT NULL OR pasta_bruto IS NOT NULL OR pasta_entrega IS NOT NULL)
       GROUP BY lote ORDER BY MAX(id) DESC LIMIT 100`
    ),
  ]);
  const nomeDe = (id: number | null) => gente.find((g) => g.id === id)?.nome ?? "Todos";

  return (
    <div className="pagina">
      <div className="cab">
        <div>
          <h1>Materiais</h1>
          <p className="sub">Ofertas, tags e os links de cada lote — o que a Nova produção usa.</p>
        </div>
      </div>
      <div className="seg abas-m">
        <Link href="/materiais?aba=ofertas" className={aba === "ofertas" ? "on" : ""}>
          Ofertas
        </Link>
        <Link href="/materiais?aba=tags" className={aba === "tags" ? "on" : ""}>
          Tags
        </Link>
        <Link href="/materiais?aba=links" className={aba === "links" ? "on" : ""}>
          Links do lote
        </Link>
      </div>

      {aba === "ofertas" && (
        <>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Oferta</th>
                  <th>Sigla</th>
                  <th>De quem</th>
                  <th>Último nº</th>
                </tr>
              </thead>
              <tbody>
                {ofs.map((o) => (
                  <tr key={o.id}>
                    <td className="b">{o.nome}</td>
                    <td className="mono">{o.sigla}</td>
                    <td>{nomeDe(o.expert_id)}</td>
                    <td className="mono">{String(o.contador).padStart(3, "0")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!ofs.length && <div className="vazio-l">Nenhuma oferta ainda.</div>}
          </div>
          {pode && (
            <Form acao={criarOferta} className="card linha-form" limpar feito="Oferta criada.">
              <input name="nome" placeholder="Nome da oferta" required />
              <input name="sigla" placeholder="Sigla (até 5)" maxLength={5} />
              <select name="expert_id" defaultValue="">
                <option value="">De todos os experts</option>
                {gente
                  .filter((g) => g.papel === "gravacao")
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      Só do {g.nome}
                    </option>
                  ))}
              </select>
              <button className="btn btn-roxo">Criar oferta</button>
            </Form>
          )}
        </>
      )}

      {aba === "tags" && (
        <>
          <div className="card tags-lista">
            {tgs.map((t) => (
              <Chip key={t.id} nome={t.nome} cor={t.cor} />
            ))}
          </div>
          {pode && (
            <Form acao={criarTag} className="card linha-form" limpar feito="Tag criada.">
              <input name="nome" placeholder="Nome da tag" required maxLength={30} />
              <select name="cor" defaultValue="cinza">
                {["cinza", "azul", "roxo", "rosa", "vermelho", "verde", "laranja"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button className="btn btn-roxo">Criar tag</button>
            </Form>
          )}
        </>
      )}

      {aba === "links" && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Produções</th>
                <th>Documento</th>
                <th>Bruto</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {(links.rows as unknown as { lote: string; de: string; ate: string; n: number; doc: string | null; bruto: string | null; entrega: string | null }[]).map((l) => (
                <tr key={l.lote}>
                  <td className="mono">{l.n > 1 ? `${l.de} → ${l.ate.split("_").pop()}` : l.de}</td>
                  <td>{l.n}</td>
                  <td>{l.doc ? <a className="link-roxo" href={l.doc} target="_blank" rel="noreferrer">abrir</a> : "—"}</td>
                  <td>{l.bruto ? <a className="link-roxo" href={l.bruto} target="_blank" rel="noreferrer">abrir</a> : "—"}</td>
                  <td>{l.entrega ? <a className="link-roxo" href={l.entrega} target="_blank" rel="noreferrer">abrir</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!links.rows.length && <div className="vazio-l">Nenhum lote com links ainda.</div>}
        </div>
      )}
    </div>
  );
}
