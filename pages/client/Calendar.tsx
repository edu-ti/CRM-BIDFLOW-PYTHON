import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  X,
  Calendar as CalendarIcon,
  AlignLeft,
  Trash2,
  Check,
  Edit2,
} from "lucide-react";
import ConfirmModal, { ConfirmModalType } from "../../components/ConfirmModal";

interface CalendarEvent {
  id: number;
  title: string;
  type: "meeting" | "deadline" | "call" | "personal";
  time: string;
  date: Date;
}

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Initialize with some events relative to current month/year so they appear in the demo
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: 1,
      title: "Reunião de Equipe",
      type: "meeting",
      time: "10:00",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 5),
    },
    {
      id: 2,
      title: "Entrega Projeto X",
      type: "deadline",
      time: "17:00",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 12),
    },
    {
      id: 3,
      title: "Call com Cliente",
      type: "call",
      time: "14:30",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
    },
    {
      id: 4,
      title: "Dentista",
      type: "personal",
      time: "18:00",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
    },
    {
      id: 5,
      title: "Lançamento Campanha",
      type: "deadline",
      time: "09:00",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 22),
    },
  ]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState<{
    title: string;
    date: string;
    time: string;
    type: "meeting" | "deadline" | "call" | "personal";
  }>({
    title: "",
    date: "",
    time: "",
    type: "meeting",
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

  const daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const openNewEventModal = () => {
    // Default date to today
    const today = new Date();
    const monthStr = (today.getMonth() + 1).toString().padStart(2, "0");
    const dayStr = today.getDate().toString().padStart(2, "0");

    setNewEvent({
      title: "",
      date: `${today.getFullYear()}-${monthStr}-${dayStr}`,
      time: "",
      type: "meeting",
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    const monthStr = (event.date.getMonth() + 1).toString().padStart(2, "0");
    const dayStr = event.date.getDate().toString().padStart(2, "0");

    setNewEvent({
      title: event.title,
      date: `${event.date.getFullYear()}-${monthStr}-${dayStr}`,
      time: event.time,
      type: event.type,
    });
    setEditingId(event.id);
    setIsModalOpen(true);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.date) return;

    // Create Date object from YYYY-MM-DD input string
    const [year, month, day] = newEvent.date.split("-").map(Number);
    const eventDate = new Date(year, month - 1, day);

    if (editingId) {
      // Update existing event
      setEvents(
        events.map((e) =>
          e.id === editingId
            ? {
                ...e,
                title: newEvent.title,
                type: newEvent.type,
                time: newEvent.time || "00:00",
                date: eventDate,
              }
            : e
        )
      );
    } else {
      // Create new event
      const event: CalendarEvent = {
        id: Date.now(),
        title: newEvent.title,
        type: newEvent.type,
        time: newEvent.time || "00:00",
        date: eventDate,
      };
      setEvents([...events, event]);
    }

    setIsModalOpen(false);
    setNewEvent({ title: "", date: "", time: "", type: "meeting" });
    setEditingId(null);
  };

  const handleDeleteEvent = () => {
    if (editingId) {
      setConfirmConfig({
        title: "Excluir Evento",
        message: "Tem certeza que deseja excluir este evento?",
        type: "error",
        confirmText: "Excluir",
        showCancel: true,
        onConfirm: () => {
          setEvents(events.filter((e) => e.id !== editingId));
          setIsModalOpen(false);
          setEditingId(null);
        },
      });
      setIsConfirmOpen(true);
    }
  };

  const getEventsForDay = (day: number) => {
    return events.filter(
      (e) =>
        e.date.getDate() === day &&
        e.date.getMonth() === currentDate.getMonth() &&
        e.date.getFullYear() === currentDate.getFullYear()
    );
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const startDay = firstDayOfMonth(currentDate);

    // Empty cells for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="bg-gray-50/50 dark:bg-gray-800/50 min-h-[100px] border border-gray-100 dark:border-gray-700 hidden md:block"
        ></div>
      );
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const dayEvents = getEventsForDay(day);
      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === currentDate.getMonth() &&
        new Date().getFullYear() === currentDate.getFullYear();

      days.push(
        <div
          key={day}
          className={`min-h-[100px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2 relative group hover:bg-gray-50 dark:hover:bg-gray-700 transition`}
        >
          <div className="flex justify-between items-start">
            <span
              className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                isToday
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {day}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const monthStr = (currentDate.getMonth() + 1)
                  .toString()
                  .padStart(2, "0");
                const dayStr = day.toString().padStart(2, "0");
                setNewEvent({
                  title: "",
                  date: `${currentDate.getFullYear()}-${monthStr}-${dayStr}`,
                  time: "",
                  type: "meeting",
                });
                setEditingId(null);
                setIsModalOpen(true);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              title="Adicionar evento neste dia"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="mt-2 space-y-1">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(event);
                }}
                className={`px-2 py-1 rounded text-xs truncate border-l-2 cursor-pointer hover:opacity-80 transition shadow-sm ${
                  event.type === "meeting"
                    ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                    : event.type === "deadline"
                    ? "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300"
                    : event.type === "personal"
                    ? "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300"
                    : "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                }`}
              >
                <span className="font-bold mr-1">{event.time}</span>
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agenda
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visualize seus compromissos e agendamentos.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 font-semibold text-gray-800 dark:text-gray-200 w-36 text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={openNewEventModal}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium transition shadow-sm"
          >
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-gray-200 dark:bg-gray-700 gap-px">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Upcoming Events List (Mobile/Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm md:col-span-1">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4">
            Próximos Eventos
          </h3>
          <div className="space-y-4">
            {events
              .filter(
                (e) => e.date >= new Date(new Date().setHours(0, 0, 0, 0))
              ) // Only future or today
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 3)
              .map((event) => (
                <div
                  key={event.id}
                  onClick={() => openEditModal(event)}
                  className="flex gap-3 items-start pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg text-center min-w-[3rem]">
                    <span className="block text-xs font-bold uppercase">
                      {monthNames[event.date.getMonth()].substring(0, 3)}
                    </span>
                    <span className="block text-xl font-bold">
                      {event.date.getDate()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <Clock size={12} /> {event.time}
                    </div>
                  </div>
                </div>
              ))}
            {events.filter(
              (e) => e.date >= new Date(new Date().setHours(0, 0, 0, 0))
            ).length === 0 && (
              <p className="text-gray-500 dark:text-gray-400  text-sm">
                Nenhum evento próximo.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* New/Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-white">
                {editingId ? "Editar Evento" : "Novo Evento"}
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
                  Título do Evento
                </label>
                <div className="relative">
                  <AlignLeft
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    placeholder="Ex: Reunião Mensal"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data
                  </label>
                  <div className="relative">
                    <CalendarIcon
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Horário
                  </label>
                  <div className="relative">
                    <Clock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="time"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      value={newEvent.time}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, time: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Evento
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  value={newEvent.type}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, type: e.target.value as any })
                  }
                >
                  <option value="meeting">Reunião</option>
                  <option value="deadline">Prazo / Entrega</option>
                  <option value="call">Chamada / Call</option>
                  <option value="personal">Pessoal</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              {editingId && (
                <button
                  onClick={handleDeleteEvent}
                  className="mr-auto px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Trash2 size={16} />{" "}
                  <span className="hidden sm:inline">Excluir</span>
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!newEvent.title || !newEvent.date}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? "Salvar Alterações" : "Criar Evento"}
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

export default Calendar;
