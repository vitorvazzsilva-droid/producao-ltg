import { eu as quemSou } from "@/lib/sessao";
import { PAPEIS } from "@/lib/fluxo";
import { TrocarSenha } from "./trocar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta" };

export default async function Conta() {
  const eu = await quemSou();
  return (
    <div className="pagina estreita">
      <div className="cab">
        <div>
          <h1>{eu.nome}</h1>
          <p className="sub">
            {PAPEIS[eu.papel]} · usuário <span className="mono">{eu.login}</span>
          </p>
        </div>
      </div>
      <TrocarSenha />
    </div>
  );
}
