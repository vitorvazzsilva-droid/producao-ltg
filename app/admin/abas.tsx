import Link from "next/link";

// Abas do painel admin. "Equipe" e a tela de acessos que ja existia (/equipe).
const ABAS = [
  { id: "resumo", rotulo: "Resumo", href: "/admin" },
  { id: "metas", rotulo: "Metas", href: "/admin?aba=metas" },
  { id: "tarefas", rotulo: "Tarefas", href: "/admin?aba=tarefas" },
  { id: "equipe", rotulo: "Equipe", href: "/equipe" },
];

export function AbasAdmin({ atual }: { atual: string }) {
  return (
    <div className="abas abas-admin">
      {ABAS.map((a) => (
        <Link key={a.id} href={a.href} className={"aba" + (atual === a.id ? " on" : "")}>
          {a.rotulo}
        </Link>
      ))}
    </div>
  );
}
