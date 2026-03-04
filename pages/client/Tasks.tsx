import React, { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  CheckCircle2,
  Search,
  Trash2,
  X,
  User,
  Edit2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { db, auth, appId } from "../../lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "completed" | "pending";
  assignee: string;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
    assignee: "Eu",
  });

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    type: ConfirmModalType;
    onConfirm?: () => void;
    confirmText?: string;
    showCancel?: boolean;
  }>({
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string,
    message: string,
    type: ConfirmModalType = "info"
  ) => {
    setConfirmConfig({
      title,
      message,
      type,
      showCancel: false,
      confirmText: "OK",
      onConfirm: () => setIsConfirmOpen(false),
    });
    setIsConfirmOpen(true);
  };

  // Conectar ao Firestore
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "tasks"
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(fetchedTasks);
        setIsLoading(false);
      },
      (error) => {
        console.error("Erro ao buscar tarefas:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleTaskStatus = async (task: Task) => {
    if (!auth.currentUser) return;
    try {
      const taskRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "tasks",
        task.id
      );
      await updateDoc(taskRef, {
        status: task.status === "pending" ? "completed" : "pending",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const deleteTask = (id: string) => {
    if (!auth.currentUser) return;

    setConfirmConfig({
      title: "Excluir Tarefa",
      message: "Tem certeza que deseja excluir esta tarefa?",
      type: "error",
      confirmText: "Excluir",
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(
              db,
              "artifacts",
              appId,
              "users",
              auth.currentUser!.uid,
              "tasks",
              id
            )
          );
        } catch (error) {
          console.error("Erro ao deletar tarefa:", error);
          showAlert("Erro", "Erro ao excluir tarefa.", "error");
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const openEditModal = (task: Task) => {
    setNewTask({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      assignee: task.assignee,
    });
    setEditingId(task.id);
    setIsModalOpen(true);
  };

  const openNewTaskModal = () => {
    setNewTask({
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      assignee: "Eu",
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!newTask.title || !auth.currentUser) return;

    try {
      const tasksRef = collection(
        db,
        "artifacts",
        appId,
        "users",
        auth.currentUser.uid,
        "tasks"
      );

      if (editingId) {
        // Editar
        await updateDoc(doc(tasksRef, editingId), {
          title: newTask.title,
          description: newTask.description || "",
          dueDate: newTask.dueDate || "Sem prazo",
          priority: newTask.priority || "medium",
          assignee: newTask.assignee || "Eu",
        });
      } else {
        // Criar
        await addDoc(tasksRef, {
          title: newTask.title,
          description: newTask.description || "",
          dueDate: newTask.dueDate || "Sem prazo",
          priority: newTask.priority || "medium",
          assignee: newTask.assignee || "Eu",
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }

      setIsModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
        assignee: "Eu",
      });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
      showAlert("Erro", "Não foi possível salvar a tarefa.", "error");
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesFilter = filter === "all" ? true : t.status === filter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tarefas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Organize seu dia e não perca prazos.
          </p>
        </div>
        <button
          onClick={openNewTaskModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium transition shadow-sm"
        >
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                filter === "all"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                filter === "pending"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                filter === "completed"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Concluídas
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700 min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-full py-20">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex items-start gap-4 group ${
                  task.status === "completed"
                    ? "opacity-60 bg-gray-50 dark:bg-gray-900/50"
                    : ""
                }`}
              >
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition ${
                    task.status === "completed"
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-400 dark:border-gray-500 text-transparent hover:border-indigo-500 dark:hover:border-indigo-400"
                  }`}
                >
                  <CheckCircle2
                    size={14}
                    fill="currentColor"
                    className={
                      task.status === "completed" ? "opacity-100" : "opacity-0"
                    }
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <h3
                      className={`font-semibold text-gray-900 dark:text-white ${
                        task.status === "completed"
                          ? "line-through text-gray-500 dark:text-gray-500"
                          : ""
                      }`}
                    >
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority === "high"
                          ? "Alta"
                          : task.priority === "medium"
                          ? "Média"
                          : "Baixa"}
                      </span>
                      {task.status === "completed" && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} /> Feito
                        </span>
                      )}
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div
                      className={`flex items-center gap-1 ${
                        task.dueDate.includes("Hoje")
                          ? "text-red-500 dark:text-red-400 font-medium"
                          : ""
                      }`}
                    >
                      <Calendar size={14} />
                      {task.dueDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      {task.assignee}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(task)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                    title="Editar Tarefa"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    title="Excluir Tarefa"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
              <AlertCircle
                size={48}
                className="text-gray-300 dark:text-gray-600 mb-4"
              />
              <p>Nenhuma tarefa encontrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* New/Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="font-bold text-gray-800 dark:text-white">
                {editingId ? "Editar Tarefa" : "Nova Tarefa"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  placeholder="Ex: Ligar para cliente..."
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  placeholder="Detalhes da tarefa..."
                  rows={3}
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prazo
                  </label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      placeholder="Hoje, 14:00"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        priority: e.target.value as any,
                      })
                    }
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsável
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    placeholder="Nome do responsável"
                    value={newTask.assignee}
                    onChange={(e) =>
                      setNewTask({ ...newTask, assignee: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTask}
                disabled={!newTask.title}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? "Salvar Alterações" : "Criar Tarefa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        confirmText={confirmConfig.confirmText}
        showCancel={confirmConfig.showCancel}
      />
    </div>
  );
};

export default Tasks;
