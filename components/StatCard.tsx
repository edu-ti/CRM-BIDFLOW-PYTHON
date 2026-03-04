import React from "react";
import { StatCardProps } from "../types";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
          <Icon size={24} />
        </div>
        {change && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : trend === "down"
                ? "text-red-600 dark:text-red-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight size={16} />
            ) : trend === "down" ? (
              <ArrowDownRight size={16} />
            ) : (
              <Minus size={16} />
            )}
            <span>{change}</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
        {title}
      </h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
      </p>
    </div>
  );
};
