"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Producao } from "@/lib/dados";
import { ETAPAS, STATUS, passoDoArrasto, passosPara, type Papel, type Status } from "@/lib/fluxo";
import { mudarEtapa } from "../acoes";
import { CardTarefa } from "../pecas";

type Pedido = { p: Producao; para: Status; placeholder: string };

// Quadro da esteira: arrastar o card pra outra coluna roda a mesma regra do
// botao (lib/fluxo). Se a regra nao deixa, o card volta e aparece o motivo.
export function Quadro({
  lista,
  eu,
  hoje,
  etapas = ETAPAS,
}: {
  lista: Producao[];
  eu: { id: number; papel: Papel };
  hoje: string;
  etapas?: Status[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState(lista);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<Status | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aviso, setAviso] = useState<{ t: string; erro?: boolean } | null>(null);
  const [, iniciar] = useTransition();

  useEffect(() => setCards(lista), [lista]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function enviar(p: Producao, para: Status, texto?: string, passo?: string) {
    const antes = p.status;
    setCards((cs) => cs.map((c) => (c.id === p.id ? { ...c, status: para } : c)));
    const f = new FormData();
    f.set("id", String(p.id));
    if (passo) f.set("passo", passo);
    else f.set("para", para);
    if (texto) f.set("texto", texto);
    const r = (await mudarEtapa(f)) as { erro?: string; para?: Status } | undefined;
    if (r?.erro) {
      setCards((cs) => cs.map((c) => (c.id === p.id ? { ...c, status: antes } : c)));
      setAviso({ t: r.erro, erro: true });
      return false;
    }
    const final = r?.para ?? para;
    setCards((cs) => cs.map((c) => (c.id === p.id ? { ...c, status: final } : c)));
    setAviso({ t: `${p.codigo} → ${STATUS[final].rotulo}` });
    iniciar(() => router.refresh());
    return true;
  }

  function soltar(para: Status) {
    setSobre(null);
    const p = cards.find((c) => c.id === arrastando);
    setArrastando(null);
    if (!p || p.status === para) return;
    const passo = passoDoArrasto(p, eu.papel, para);
    if (!passo) {
      setAviso({ t: `Você não pode mover de “${STATUS[p.status as Status].rotulo}” pra “${STATUS[para].rotulo}”.`, erro: true });
      return;
    }
    if (passo.pedeTexto) setPedido({ p, para, placeholder: passo.pedeTexto });
    else enviar(p, para);
  }

  return (
    <>
      <div className={"kanban" + (etapas.length === 1 ? " uma" : "")}>
        {etapas.map((s) => {
          const col = cards.filter((p) => p.status === s);
          return (
            <div
              key={s}
              id={`col-${s}`}
              className={`col st-${s}` + (sobre === s ? " sobre" : "")}
              onDragOver={(e) => {
                if (arrastando === null) return;
                e.preventDefault();
                if (sobre !== s) setSobre(s);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                soltar(s);
              }}
            >
              <div className="col-hd">
                <span className="col-ponto" />
                <span>{STATUS[s].rotulo}</span>
                <span className="col-n">{col.length}</span>
              </div>
              <div className="col-lista">
                {col.map((p) => {
                  // Atalho no proprio card: o passo principal da vez, sem abrir.
                  const atalho = passosPara(p, eu.papel).find((x) => x.principal && !x.pedeTexto);
                  return (
                    <div
                      key={p.id}
                      className={"arrastavel" + (arrastando === p.id ? " fantasma" : "")}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(p.id));
                        setArrastando(p.id);
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setSobre(null);
                      }}
                    >
                      <CardTarefa p={p} hoje={hoje} />
                      {atalho && (
                        <button className="ct-atalho" onClick={() => enviar(p, atalho.para, undefined, atalho.id)}>
                          {atalho.rotulo}
                        </button>
                      )}
                    </div>
                  );
                })}
                {!col.length && <div className="col-vazia">vazio</div>}
              </div>
            </div>
          );
        })}
      </div>

      {pedido && (
        <div className="modal-fundo" onClick={() => setPedido(null)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const texto = String(new FormData(e.currentTarget).get("texto") ?? "").trim();
              if (!texto) return;
              const ok = await enviar(pedido.p, pedido.para, texto);
              if (ok) setPedido(null);
            }}
          >
            <b>
              {pedido.p.codigo} → {STATUS[pedido.para].rotulo}
            </b>
            <p className="dica">Conte o que precisa mudar. Sem isso o card não anda.</p>
            <textarea name="texto" rows={4} placeholder={pedido.placeholder} autoFocus required />
            <div className="modal-pe">
              <button type="button" className="btn sec-btn" onClick={() => setPedido(null)}>
                Cancelar
              </button>
              <button className="btn perigo">Pedir ajuste</button>
            </div>
          </form>
        </div>
      )}

      {aviso && <div className={"toast" + (aviso.erro ? " erro-t" : "")}>{aviso.t}</div>}
    </>
  );
}
