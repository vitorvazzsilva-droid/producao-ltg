import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { eu as quemSou } from "@/lib/sessao";
import { tempo } from "@/lib/producao-base";
import { PAPEIS } from "@/lib/fluxo";
import { FERRAMENTAS, GRUPOS_VEGA, defDe } from "@/lib/vega";
import { Chat, type Item } from "./chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lyra" };

type Conv = { id: number; titulo: string; atualizado_em: string; mensagens: string; pendente: string | null };

const horas = (utc: string) => Math.floor((Date.now() - new Date(utc.replace(" ", "T") + "Z").getTime()) / 3600000);

// Transforma o historico da API no que a tela mostra: falas, e um chip pra
// cada ferramenta que a Vega usou.
function itens(msgs: Anthropic.Beta.BetaMessageParam[]): Item[] {
  const out: Item[] = [];
  for (const m of msgs) {
    if (typeof m.content === "string") {
      out.push({ quem: m.role === "user" ? "eu" : "vega", texto: m.content });
      continue;
    }
    for (const b of m.content ?? []) {
      if (b.type === "text" && b.text.trim()) out.push({ quem: m.role === "user" ? "eu" : "vega", texto: b.text });
      if (b.type === "tool_use") {
        const d = defDe(b.name);
        out.push({ quem: "acao", texto: d?.rotulo ?? b.name, altera: !!d?.altera });
      }
      if (b.type === "tool_result" && b.is_error && typeof b.content === "string" && b.content.startsWith("A pessoa NÃO")) {
        out.push({ quem: "acao", texto: "Você não permitiu", altera: true, negado: true });
      }
    }
  }
  return out;
}

export default async function Vega({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const eu = await quemSou();
  const sel = Number((await searchParams).c) || 0;
  const [chave, convs] = await Promise.all([
    db.execute({ sql: "SELECT anthropic_chave IS NOT NULL AS tem FROM usuarios WHERE id = ?", args: [eu.id] }),
    db.execute({ sql: "SELECT id, titulo, atualizado_em, mensagens, pendente FROM vega_conversas WHERE usuario_id = ? ORDER BY atualizado_em DESC LIMIT 50", args: [eu.id] }),
  ]);
  const lista = convs.rows as unknown as Conv[];
  const atual = lista.find((c) => c.id === sel) ?? null;
  const consultas = FERRAMENTAS.filter((f) => !f.altera).length;
  const alteracoes = FERRAMENTAS.length - consultas;

  return (
    <div className="pagina vega-pag">
      <Chat
        nome={eu.nome.split(" ")[0]}
        papel={PAPEIS[eu.papel]}
        temChave={!!Number(chave.rows[0]?.tem)}
        conversas={lista.map((c) => ({ id: c.id, titulo: c.titulo, quando: tempo(horas(c.atualizado_em)) }))}
        atual={atual ? { id: atual.id, itens: itens(JSON.parse(atual.mensagens)), pendente: atual.pendente ? (JSON.parse(atual.pendente).descricao as string) : null } : null}
        capacidades={{
          consultas,
          alteracoes,
          grupos: GRUPOS_VEGA.map((g) => ({
            nome: g,
            itens: FERRAMENTAS.filter((f) => f.grupo === g).map((f) => ({ rotulo: f.rotulo, altera: f.altera })),
          })),
        }}
      />
    </div>
  );
}
