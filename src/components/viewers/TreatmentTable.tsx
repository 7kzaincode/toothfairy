/**
 * TreatmentTable - Condition table with clickable rows (stretch goal)
 * TODO: Implement table with condition, treatment, urgency, cost columns
 */

"use client";

import type { TreatmentProtocol } from "@/types/patient-state";

interface TreatmentTableProps {
  protocols: TreatmentProtocol[];
  onRowClick?: (protocol: TreatmentProtocol) => void;
}

export default function TreatmentTable({ protocols, onRowClick }: TreatmentTableProps) {
  return (
    <div className="flex-1 overflow-auto p-4">
      {/* TODO: Table with columns: Tooth, Condition, Treatment, Urgency, CDT, Cost */}
    </div>
  );
}
