"use client";

import type { TreatmentProtocol } from "@/types/patient-state";

const URGENCY_COLORS: Record<string, string> = {
  immediate: "#FF5C7A",
  soon: "#F4C152",
  routine: "#2BD4A7",
  monitor: "#4C9AFF",
};

interface TreatmentTableProps {
  protocols: TreatmentProtocol[];
  onRowClick?: (protocol: TreatmentProtocol) => void;
}

export default function TreatmentTable({ protocols, onRowClick }: TreatmentTableProps) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.04em] text-ide-muted border-b border-ide-border">
            <th className="py-2 pr-3">Tooth</th>
            <th className="py-2 pr-3">Condition</th>
            <th className="py-2 pr-3">Treatment</th>
            <th className="py-2 pr-3">Urgency</th>
            <th className="py-2 pr-3">CDT</th>
            <th className="py-2">Cost</th>
          </tr>
        </thead>
        <tbody>
          {protocols.map((p, i) => {
            const color = URGENCY_COLORS[p.urgency] || "#6E7A92";
            return (
              <tr
                key={`${p.tooth_number}-${p.condition}-${i}`}
                onClick={() => onRowClick?.(p)}
                className="border-b border-ide-hairline cursor-pointer hover:bg-ide-surface transition-colors"
              >
                <td className="py-2.5 pr-3 font-mono text-ide-text">
                  #{p.tooth_number}
                </td>
                <td className="py-2.5 pr-3 text-ide-text capitalize">
                  {p.condition.replace(/_/g, " ")}
                </td>
                <td className="py-2.5 pr-3 text-ide-text-2">
                  {p.recommended_treatment}
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ color, background: `${color}20` }}
                  >
                    {p.urgency}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-mono text-ide-muted">
                  {p.cdt_code || "—"}
                </td>
                <td className="py-2.5 font-mono text-ide-muted">
                  {p.estimated_cost || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
