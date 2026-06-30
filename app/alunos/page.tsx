"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Edit3,
  MessageCircle,
  Plus,
  Search,
  Snowflake,
  Trophy,
  Trash2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Modal, StatusBadge } from "@/components/ui";
import { auth, db } from "@/lib/firebase";

type StudentStatus = "ativo" | "vencido" | "congelado";
type Filter = "Todos" | "Ativos" | "Vencidos" | "Congelados";

type Student = {
  id: string;
  name: string;
  whatsapp: string;
  modality: string;
  monthlyFee: string;
  enrollmentDate: string;
  lastPaymentDate: string;
  nextDueDate: string;
  status: StudentStatus;
  isCompetitor?: boolean;
  createdAt?: unknown;
  frozenAt?: string | null;
  frozenDaysRemaining?: number;
  daysUsed?: number;
};

type StudentForm = {
  name: string;
  whatsapp: string;
  modality: string;
  monthlyFee: string;
  enrollmentDate: string;
  lastPaymentDate: string;
  nextDueDate: string;
  status: StudentStatus;
  isCompetitor: boolean;
};

const filters: Filter[] = ["Todos", "Ativos", "Vencidos", "Congelados"];
const blankForm: StudentForm = {
  name: "",
  whatsapp: "",
  modality: "",
  monthlyFee: "",
  enrollmentDate: "",
  lastPaymentDate: "",
  nextDueDate: "",
  status: "ativo",
  isCompetitor: false,
};

const statusLabel: Record<StudentStatus, string> = {
  ativo: "ativo",
  vencido: "vencido",
  congelado: "congelado",
};

const filterToStatus: Record<Exclude<Filter, "Todos">, StudentStatus> = {
  Ativos: "ativo",
  Vencidos: "vencido",
  Congelados: "congelado",
};

const dayMs = 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / dayMs));
}

function normalizeToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function computeStatus(student: Student): StudentStatus {
  if (student.status === "congelado") return "congelado";
  const dueDate = parseDate(student.nextDueDate);
  if (!dueDate) return student.status;
  return dueDate < normalizeToday() ? "vencido" : "ativo";
}

function isNearDueDate(student: Student): boolean {
  if (computeStatus(student) !== "ativo") return false;
  const dueDate = parseDate(student.nextDueDate);
  if (!dueDate) return false;
  const daysRemaining = diffDays(normalizeToday(), dueDate);
  return daysRemaining <= 3;
}

function getCardStatusColor(student: Student): "active" | "warning" | "expired" | "frozen" {
  const status = computeStatus(student);
  if (status === "congelado") return "frozen";
  if (status === "vencido") return "expired";
  if (isNearDueDate(student)) return "warning";
  return "active";
}

function overdueDays(student: Student) {
  if (computeStatus(student) !== "vencido") return 0;
  const dueDate = parseDate(student.nextDueDate);
  if (!dueDate) return 0;
  return diffDays(dueDate, normalizeToday());
}

function whatsappLink(student: Student) {
  const message = encodeURIComponent(
    `Olá, ${student.name}!\n\nVerificamos que sua mensalidade do CT BODY FIGHT encontra-se vencida.\n\nPedimos que realize o pagamento para manter sua matrícula ativa.\n\nCaso o pagamento já tenha sido efetuado, por favor desconsidere esta mensagem.\n\nObrigado!\nCT BODY FIGHT`,
  );
  const digits = student.whatsapp.replace(/\D/g, "");
  return `https://wa.me/55${digits}?text=${message}`;
}

export default function AlunosPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("Todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [freezeTarget, setFreezeTarget] = useState<Student | null>(null);
  const [resumeTarget, setResumeTarget] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(blankForm);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  async function loadStudents() {
    const snapshot = await getDocs(collection(db, "students"));
    const items = snapshot.docs.map((item) => {
      const data = item.data() as Partial<Student>;
      return {
        id: data.id ?? item.id,
        name: data.name ?? "",
        whatsapp: data.whatsapp ?? "",
        modality: data.modality ?? "",
        monthlyFee: data.monthlyFee ?? "",
        enrollmentDate: data.enrollmentDate ?? "",
        lastPaymentDate: data.lastPaymentDate ?? "",
        nextDueDate: data.nextDueDate ?? "",
        status: (data.status ?? "ativo") as StudentStatus,
        isCompetitor: data.isCompetitor ?? false,
        createdAt: data.createdAt,
        frozenAt: data.frozenAt ?? null,
        frozenDaysRemaining: data.frozenDaysRemaining,
        daysUsed: data.daysUsed,
      };
    });

    setStudents(items);
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      loadStudents().catch(() => setStudents([]));
    });
  }, [router]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const currentStatus = computeStatus(student);
      const matchesQuery =
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.modality.toLowerCase().includes(query.toLowerCase()) ||
        student.whatsapp.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        activeFilter === "Todos" ? true : currentStatus === filterToStatus[activeFilter];
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, query, students]);

  const totals = useMemo(() => {
    const resolved = students.map((student) => ({ ...student, status: computeStatus(student) }));
    return {
      total: resolved.length,
      vencidos: resolved.filter((student) => student.status === "vencido").length,
      congelados: resolved.filter((student) => student.status === "congelado").length,
    };
  }, [students]);

  function openCreateModal() {
    setForm(blankForm);
    setIsCreateOpen(true);
  }

  function openEditModal(student: Student) {
    setEditTarget(student);
    setForm({
      name: student.name,
      whatsapp: student.whatsapp,
      modality: student.modality,
      monthlyFee: student.monthlyFee,
      enrollmentDate: student.enrollmentDate,
      lastPaymentDate: student.lastPaymentDate,
      nextDueDate: student.nextDueDate,
      status: computeStatus(student),
      isCompetitor: student.isCompetitor ?? false,
    });
  }

  async function submitCreate() {
    const id = crypto.randomUUID();
    await setDoc(doc(db, "students", id), {
      id,
      name: form.name.trim(),
      whatsapp: form.whatsapp.trim(),
      modality: form.modality.trim(),
      monthlyFee: form.monthlyFee.trim(),
      enrollmentDate: form.enrollmentDate.trim(),
      lastPaymentDate: form.lastPaymentDate.trim(),
      nextDueDate: form.nextDueDate.trim(),
      status: form.status,
      isCompetitor: form.isCompetitor,
      daysUsed: 0,
      frozenDaysRemaining: 0,
      frozenAt: null,
      createdAt: serverTimestamp(),
    });
    setIsCreateOpen(false);
    setForm(blankForm);
    await loadStudents();
  }

  async function submitEdit() {
    if (!editTarget) return;
    await updateDoc(doc(db, "students", editTarget.id), {
      name: form.name.trim(),
      whatsapp: form.whatsapp.trim(),
      modality: form.modality.trim(),
      monthlyFee: form.monthlyFee.trim(),
      enrollmentDate: form.enrollmentDate.trim(),
      lastPaymentDate: form.lastPaymentDate.trim(),
      nextDueDate: form.nextDueDate.trim(),
      status: form.status,
      isCompetitor: form.isCompetitor,
    });
    setEditTarget(null);
    setForm(blankForm);
    await loadStudents();
  }

  async function registerPayment(student: Student) {
    const dueDate = parseDate(student.nextDueDate);
    if (!dueDate) return;
    const nextDue = addDays(dueDate, 30);
    await updateDoc(doc(db, "students", student.id), {
      nextDueDate: formatDate(nextDue),
      status: "ativo",
    });
    await loadStudents();
  }

  async function freezeStudent(student: Student) {
    const dueDate = parseDate(student.nextDueDate);
    if (!dueDate) return;

    const now = new Date();
    const remaining = diffDays(normalizeToday(), dueDate);
    const enrollmentDate = parseDate(student.enrollmentDate) ?? now;
    const daysUsed = diffDays(enrollmentDate, now);

    await updateDoc(doc(db, "students", student.id), {
      status: "congelado",
      frozenAt: formatDate(now),
      frozenDaysRemaining: remaining,
      daysUsed,
    });
    setFreezeTarget(null);
    await loadStudents();
  }

  async function resumeStudent(student: Student) {
    const remaining = student.frozenDaysRemaining ?? 30;
    const nextDue = addDays(new Date(), remaining);
    await updateDoc(doc(db, "students", student.id), {
      status: "ativo",
      frozenAt: null,
      frozenDaysRemaining: 0,
      nextDueDate: formatDate(nextDue),
      lastPaymentDate: formatDate(new Date()),
    });
    setResumeTarget(null);
    await loadStudents();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, "students", deleteTarget.id));
    setDeleteTarget(null);
    await loadStudents();
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  const isFormValid = Boolean(
    form.name.trim() &&
      form.whatsapp.trim() &&
      form.modality.trim() &&
      form.monthlyFee.trim() &&
      form.enrollmentDate.trim() &&
      form.lastPaymentDate.trim() &&
      form.nextDueDate.trim(),
  );

  return (
    <main className="min-h-[100dvh] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col items-start justify-between gap-3 border-b border-gold-200/10 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-[0.3em] text-gold-200/90 sm:text-xs sm:tracking-[0.4em]">CT BODY FIGHT</p>
            <h1 className="mt-1 text-lg font-semibold text-white sm:mt-2 sm:text-2xl">Alunos</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="secondary" size="sm" onClick={() => router.replace("/financeiro")} className="!h-8 !px-3 !py-1 !text-xs flex-1 sm:flex-none">
              Financeiro
            </Button>
            <Button variant="secondary" size="sm" onClick={handleLogout} className="!h-8 !px-3 !py-1 !text-xs flex-1 sm:flex-none">
              Sair
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-white/55">Total de alunos</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totals.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-white/55">Vencidos</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totals.vencidos}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-white/55">Congelados</p>
            <p className="mt-2 text-2xl font-semibold text-white">{totals.congelados}</p>
          </Card>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label="Busca"
            placeholder="Buscar aluno..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </section>

        <section className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const count = filter === "Todos"
              ? totals.total
              : filter === "Ativos"
                ? totals.total - totals.vencidos - totals.congelados
                : filter === "Vencidos"
                  ? totals.vencidos
                  : totals.congelados;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  activeFilter === filter
                    ? "border-gold-300/30 bg-gold-300/12 text-gold-100"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {filter} ({count})
              </button>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => {
            const currentStatus = computeStatus(student);
            const overdue = overdueDays(student);
            return (
              <Card
                key={student.id}
                statusColor={getCardStatusColor(student)}
                className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5 cursor-pointer"
                onClick={() => setExpandedCardId(expandedCardId === student.id ? null : student.id)}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="break-words text-base font-semibold text-white sm:text-lg">{student.name}</p>
                      {student.isCompetitor && (
                        <Trophy className="h-4 w-4 text-gold-300 shrink-0" />
                      )}
                    </div>
                    <p className="mt-1 break-words text-xs text-white/55 sm:text-sm">{student.modality}</p>
                  </div>
                  <StatusBadge className="shrink-0 text-[10px] sm:text-xs" status={currentStatus}>
                    {statusLabel[currentStatus]}
                  </StatusBadge>
                </div>

                {expandedCardId === student.id && (
                  <>
                    <div className="grid gap-1.5 border-t border-white/10 pt-3 text-xs sm:gap-2 sm:pt-4 sm:text-sm">
                      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                        <span className="text-white/55">WhatsApp</span>
                        <span className="min-w-0 break-all text-right font-medium text-white">
                          {student.whatsapp}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                        <span className="text-white/55">Matrícula</span>
                        <span className="shrink-0 text-right font-medium text-white">{student.enrollmentDate}</span>
                      </div>
                      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                        <span className="text-white/55">Último pagamento</span>
                        <span className="shrink-0 text-right font-medium text-white">{student.lastPaymentDate}</span>
                      </div>
                      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                        <span className="text-white/55">Próximo vencimento</span>
                        <span className="shrink-0 text-right font-medium text-white">{student.nextDueDate}</span>
                      </div>
                      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                        <span className="text-white/55">Mensalidade</span>
                        <span className="shrink-0 text-right font-medium text-white">{student.monthlyFee}</span>
                      </div>
                      {currentStatus === "vencido" ? (
                        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                          <span className="text-white/55">Dias em atraso</span>
                          <span className="shrink-0 text-right font-medium text-status-expired">
                            {overdue} dias
                          </span>
                        </div>
                      ) : null}
                      {currentStatus === "congelado" ? (
                        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                          <span className="text-white/55">Dias utilizados</span>
                          <span className="shrink-0 text-right font-medium text-status-frozen">
                            {student.daysUsed ?? 0} dias
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 sm:gap-2">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); registerPayment(student); }} className="text-xs sm:text-sm">
                        <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Pagar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); window.open(whatsappLink(student), "_blank", "noopener,noreferrer"); }}
                        className="text-xs sm:text-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        WhatsApp
                      </Button>
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(student); }} className="text-xs sm:text-sm">
                        <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Editar
                      </Button>
                      {currentStatus === "congelado" ? (
                        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setResumeTarget(student); }} className="text-xs sm:text-sm">
                          <Snowflake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Retomar
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setFreezeTarget(student); }} className="text-xs sm:text-sm">
                          <Snowflake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Congelar
                        </Button>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(student); }}
                        className="w-full border border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 sm:text-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Excluir
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </section>
      </div>

      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] inline-flex max-w-[calc(100vw-2rem)] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-4 py-3 text-xs font-semibold text-black shadow-glow transition hover:brightness-110 sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:right-[calc(1.25rem+env(safe-area-inset-right))] sm:max-w-[calc(100vw-2.5rem)] sm:px-5 sm:py-4 sm:text-sm"
      >
        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Novo Aluno</span>
        <span className="sm:hidden">Novo</span>
      </button>

      <Modal
        open={isCreateOpen}
        title="Novo aluno"
        description="Cadastro no Firestore."
        onClose={() => setIsCreateOpen(false)}
      >
        <div className="grid gap-4">
          <Input
            label="Nome"
            placeholder="Nome do aluno"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="WhatsApp"
            placeholder="(11) 99999-9999"
            value={form.whatsapp}
            onChange={(event) =>
              setForm((current) => ({ ...current, whatsapp: event.target.value }))
            }
          />
          <Input
            label="Modalidade"
            placeholder="Muay Thai"
            value={form.modality}
            onChange={(event) =>
              setForm((current) => ({ ...current, modality: event.target.value }))
            }
          />
          <Input
            label="Valor mensalidade"
            placeholder="R$ 180,00"
            value={form.monthlyFee}
            onChange={(event) =>
              setForm((current) => ({ ...current, monthlyFee: event.target.value }))
            }
          />
          <Input
            label="Data de matrícula"
            placeholder="18/07/2026"
            value={form.enrollmentDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, enrollmentDate: event.target.value }))
            }
          />
          <Input
            label="Último pagamento"
            placeholder="18/07/2026"
            value={form.lastPaymentDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, lastPaymentDate: event.target.value }))
            }
          />
          <Input
            label="Próximo vencimento"
            placeholder="18/08/2026"
            value={form.nextDueDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, nextDueDate: event.target.value }))
            }
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isCompetitor"
              checked={form.isCompetitor}
              onChange={(event) =>
                setForm((current) => ({ ...current, isCompetitor: event.target.checked }))
              }
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-gold-300 focus:ring-gold-300/50"
            />
            <label htmlFor="isCompetitor" className="text-sm font-medium text-white/80">
              Atleta Profissional
            </label>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="secondary" size="lg" onClick={() => setIsCreateOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button size="lg" onClick={submitCreate} disabled={!isFormValid} className="flex-1">
              Salvar aluno
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        title="Editar aluno"
        description="Atualiza no Firestore."
        onClose={() => {
          setEditTarget(null);
          setForm(blankForm);
        }}
      >
        <div className="grid gap-4">
          <Input
            label="Nome"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(event) =>
              setForm((current) => ({ ...current, whatsapp: event.target.value }))
            }
          />
          <Input
            label="Modalidade"
            value={form.modality}
            onChange={(event) =>
              setForm((current) => ({ ...current, modality: event.target.value }))
            }
          />
          <Input
            label="Valor mensalidade"
            value={form.monthlyFee}
            onChange={(event) =>
              setForm((current) => ({ ...current, monthlyFee: event.target.value }))
            }
          />
          <Input
            label="Data de matrícula"
            value={form.enrollmentDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, enrollmentDate: event.target.value }))
            }
          />
          <Input
            label="Último pagamento"
            value={form.lastPaymentDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, lastPaymentDate: event.target.value }))
            }
          />
          <Input
            label="Próximo vencimento"
            value={form.nextDueDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, nextDueDate: event.target.value }))
            }
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="editIsCompetitor"
              checked={form.isCompetitor}
              onChange={(event) =>
                setForm((current) => ({ ...current, isCompetitor: event.target.checked }))
              }
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-gold-300 focus:ring-gold-300/50"
            />
            <label htmlFor="editIsCompetitor" className="text-sm font-medium text-white/80">
              Atleta Profissional
            </label>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setEditTarget(null);
                setForm(blankForm);
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button size="lg" onClick={submitEdit} disabled={!isFormValid} className="flex-1">
              Salvar alterações
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Excluir aluno"
        description="Remoção permanente."
        onClose={() => setDeleteTarget(null)}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {deleteTarget ? (
              <>
                Confirma a exclusão de <span className="font-semibold text-white">{deleteTarget.name}</span>?
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

      <Modal
        open={Boolean(freezeTarget)}
        title="Congelar matrícula"
        description="Pausa a contagem e salva os dias restantes."
        onClose={() => setFreezeTarget(null)}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {freezeTarget ? `Congelar matrícula de ${freezeTarget.name}?` : null}
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setFreezeTarget(null)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => freezeTarget && freezeStudent(freezeTarget)}
              className="flex-1 bg-gradient-to-r from-status-frozen to-slate-700 text-white"
            >
              Congelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(resumeTarget)}
        title="Retomar matrícula"
        description="Continua de onde parou."
        onClose={() => setResumeTarget(null)}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {resumeTarget ? `Retomar matrícula de ${resumeTarget.name}?` : null}
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setResumeTarget(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={() => resumeTarget && resumeStudent(resumeTarget)} className="flex-1">
              Retomar
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
