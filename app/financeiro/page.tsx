"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { DollarSign, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Modal } from "@/components/ui";
import { auth, db } from "@/lib/firebase";

type Expense = {
  id: string;
  description: string;
  amount: string;
  date: string;
  category: string;
  createdAt?: unknown;
};

type ExpenseForm = {
  description: string;
  amount: string;
  date: string;
  category: string;
};

const blankForm: ExpenseForm = {
  description: "",
  amount: "",
  date: "",
  category: "",
};

const categories = ["Aluguel", "Luz", "Água", "Internet", "Equipamentos", "Limpeza", "Outros"];

const dayMs = 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  return cleaned ? Number(cleaned) : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function FinanceiroPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(blankForm);

  async function loadStudents() {
    const snapshot = await getDocs(collection(db, "students"));
    const items = snapshot.docs.map((item) => item.data());
    setStudents(items);
  }

  async function loadExpenses() {
    const snapshot = await getDocs(collection(db, "expenses"));
    const items = snapshot.docs.map((item) => {
      const data = item.data() as Partial<Expense>;
      return {
        id: data.id ?? item.id,
        description: data.description ?? "",
        amount: data.amount ?? "",
        date: data.date ?? "",
        category: data.category ?? "",
        createdAt: data.createdAt,
      };
    });
    setExpenses(items);
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      loadStudents().catch(() => setStudents([]));
      loadExpenses().catch(() => setExpenses([]));
    });
  }, [router]);

  const monthlyRevenue = useMemo(() => {
    return students.reduce((total, student) => {
      if (student.status !== "ativo") return total;
      const amount = parseCurrency(student.monthlyFee || "0");
      return total + amount;
    }, 0);
  }, [students]);

  const monthlyExpenses = useMemo(() => {
    return expenses.reduce((total, expense) => {
      const amount = parseCurrency(expense.amount);
      return total + amount;
    }, 0);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return expenses;
    const [selectedYear, selectedMonthNum] = selectedMonth.split("-").map(Number);
    return expenses.filter((expense) => {
      const date = parseDate(expense.date);
      if (!date) return false;
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonthNum;
    });
  }, [expenses, selectedMonth]);

  const filteredMonthlyExpenses = useMemo(() => {
    return filteredExpenses.reduce((total, expense) => {
      const amount = parseCurrency(expense.amount);
      return total + amount;
    }, 0);
  }, [filteredExpenses]);

  const filteredNetIncome = useMemo(() => {
    return monthlyRevenue - filteredMonthlyExpenses;
  }, [monthlyRevenue, filteredMonthlyExpenses]);

  function openCreateModal() {
    setForm(blankForm);
    setIsCreateOpen(true);
  }

  async function submitCreate() {
    const id = crypto.randomUUID();
    await setDoc(doc(db, "expenses", id), {
      id,
      description: form.description.trim(),
      amount: form.amount.trim(),
      date: form.date.trim(),
      category: form.category.trim(),
      createdAt: serverTimestamp(),
    });
    setIsCreateOpen(false);
    setForm(blankForm);
    await loadExpenses();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, "expenses", deleteTarget.id));
    setDeleteTarget(null);
    await loadExpenses();
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  const isFormValid = Boolean(
    form.description.trim() &&
      form.amount.trim() &&
      form.date.trim() &&
      form.category.trim(),
  );

  return (
    <main className="min-h-[100dvh] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col items-start justify-between gap-3 border-b border-gold-200/10 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-[0.3em] text-gold-200/90 sm:text-xs sm:tracking-[0.4em]">CT BODY FIGHT</p>
            <h1 className="mt-1 text-lg font-semibold text-white sm:mt-2 sm:text-2xl">Financeiro</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="secondary" size="sm" onClick={() => router.replace("/alunos")} className="!h-8 !px-3 !py-1 !text-xs flex-1 sm:flex-none">
              Alunos
            </Button>
            <Button variant="secondary" size="sm" onClick={handleLogout} className="!h-8 !px-3 !py-1 !text-xs flex-1 sm:flex-none">
              Sair
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card statusColor="active" className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-status-active" />
              <p className="text-sm text-white/55">Receita Bruta</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(monthlyRevenue)}</p>
          </Card>
          <Card statusColor="expired" className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-status-expired" />
              <p className="text-sm text-white/55">Despesas</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(filteredMonthlyExpenses)}</p>
          </Card>
          <Card statusColor="active" className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-gold-300" />
              <p className="text-sm text-white/55">Líquido</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(filteredNetIncome)}</p>
          </Card>
        </section>

        <section className="mt-6">
          <div className="flex flex-col items-start justify-between gap-3 mb-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-white">Despesas</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-gold-200/30"
              />
              <Button variant="primary" size="sm" onClick={openCreateModal} className="!h-8 !px-3 !py-1 !text-xs flex-1 sm:flex-none">
                <Plus className="h-3.5 w-3.5" />
                Nova Despesa
              </Button>
            </div>
          </div>

          <div className="grid gap-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:grid-cols-2 lg:grid-cols-3">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-semibold text-white">{expense.description}</p>
                    <p className="mt-1 text-xs text-white/55">{expense.category}</p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold text-status-expired">
                    {formatCurrency(parseCurrency(expense.amount))}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <p className="text-xs text-white/55">{expense.date}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(expense)}
                    className="!h-7 !px-2 !text-xs text-white/70 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <Modal
        open={isCreateOpen}
        title="Nova despesa"
        description="Cadastro no Firestore."
        onClose={() => setIsCreateOpen(false)}
      >
        <div className="grid gap-4">
          <Input
            label="Descrição"
            placeholder="Ex: Conta de luz"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
          <Input
            label="Valor"
            placeholder="R$ 150,00"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
          />
          <Input
            label="Data"
            placeholder="18/07/2026"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Categoria</label>
            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={!isFormValid} className="flex-1">
              Salvar despesa
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Excluir despesa"
        description="Remoção permanente."
        onClose={() => setDeleteTarget(null)}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {deleteTarget ? (
              <>
                Confirma a exclusão de <span className="font-semibold text-white">{deleteTarget.description}</span>?
              </>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              className="flex-1 bg-gradient-to-r from-status-expired to-red-700 text-white"
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
