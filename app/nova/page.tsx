import { redirect } from "next/navigation";
import { eu as quemSou } from "@/lib/sessao";
import { usuarios } from "@/lib/dados";
import { LADOS, TIPOS } from "@/lib/fluxo";
import { criarProducao } from "../acoes";
import { Form } from "../form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova copy" };

export default async function Nova() {
  const eu = await quemSou();
  if (eu.papel !== "admin" && eu.papel !== "copy") redirect("/");
  const gente = await usuarios(true);

  return (
    <div className="pagina estreita">
      <div className="cab">
        <div>
          <h1>Nova copy</h1>
          <p className="sub">Escreva a copy e os recados pra gravação e edição. O código sai sozinho (LTG_número_ângulo).</p>
        </div>
      </div>

      <Form acao={criarProducao} className="bloco form-nova">
        <label>
          Ângulo <small>a ideia central em 1–3 palavras</small>
          <input name="angulo" required placeholder="Ex.: dólar, prova social, objeção tempo" />
        </label>
        <div className="tres">
          <label>
            Lado
            <select name="lado" defaultValue="black">
              {Object.entries(LADOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select name="tipo" defaultValue="anuncio">
              {Object.entries(TIPOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prazo
            <input name="prazo" type="date" />
          </label>
        </div>
        <label>
          Formato
          <input name="formato" placeholder="Caixinha de perguntas, POV, print de resultado, talking head…" />
        </label>
        <label>
          Link do criativo de referência
          <input name="referencia_url" type="url" placeholder="https://…" />
        </label>
        <label>
          Link de print/imagem de referência <small>opcional</small>
          <input name="referencia_img" type="url" placeholder="https://… (.jpg, .png)" />
        </label>
        <label>
          Hook
          <input name="hook" placeholder="A frase dos primeiros 3 segundos" />
        </label>
        <label>
          Copy
          <textarea name="copy" rows={10} placeholder="O roteiro inteiro (pode deixar pra depois)" />
        </label>
        <label>
          Recado pra gravação <small>tom, cenário, roupa, o que mostrar</small>
          <textarea name="briefing_gravacao" rows={3} placeholder="Ex.: grava em pé, energia alta, mostra o celular com o painel em dólar" />
        </label>
        <label>
          Recado pra edição
          <textarea name="briefing" rows={4} placeholder="Ritmo, legenda, inserções, música, o que NÃO fazer…" />
        </label>
        <div className="duas">
          <label>
            Copy responsável
            <select name="copy_id" defaultValue={eu.papel === "copy" ? eu.id : ""}>
              <option value="">—</option>
              {gente
                .filter((u) => u.papel === "copy" || u.papel === "admin")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Editor
            <select name="editor_id" defaultValue="">
              <option value="">quem pegar primeiro</option>
              {gente
                .filter((u) => u.papel === "editor")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <button className="btn grande">Criar copy</button>
      </Form>
    </div>
  );
}
