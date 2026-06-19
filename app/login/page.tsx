"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/alunos");
    } catch {
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col justify-center">
        <section className="rounded-3xl border border-gold-200/10 bg-white/5 p-5 shadow-glow backdrop-blur-sm sm:p-8">
          <div className="mb-6 text-center sm:mb-8">
            <p className="text-xs font-medium tracking-[0.3em] text-gold-200/90 sm:text-sm sm:tracking-[0.4em]">CT BODY FIGHT</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-3 sm:text-3xl">
              Acesso ao sistema
            </h1>
            <p className="mt-1 text-xs text-white/60 sm:mt-2 sm:text-sm">Base visual minimalista para entrada de usuários.</p>
          </div>

          <form className="space-y-4 pb-[env(safe-area-inset-bottom)]" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="email">
                Email
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <Mail className="h-4 w-4 text-gold-200" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="password">
                Senha
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <LockKeyhole className="h-4 w-4 text-gold-200" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
            </div>

            {error ? <p className="text-sm text-status-expired">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-300 to-gold-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
