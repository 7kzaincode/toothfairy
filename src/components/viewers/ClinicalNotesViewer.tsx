"use client";

import type { ClinicalNotesOutput } from "@/types/patient-state";
import NotesHighlighter from "./NotesHighlighter";
import TreatmentTimeline from "./TreatmentTimeline";
import FindingsPanel from "./FindingsPanel";

interface ClinicalNotesViewerProps {
  notesText?: string;
  output?: ClinicalNotesOutput;
  onTextHighlight?: (text: string) => void;
  onTimelineEntryClick?: (entry: { condition: string; tooth_number: number }) => void;
  processing?: boolean;
}

export default function ClinicalNotesViewer({
  notesText,
  output,
  onTextHighlight,
  onTimelineEntryClick,
  processing,
}: ClinicalNotesViewerProps) {
  return (
    <div className="flex h-full">
      {/* Notes side */}
      <div className="flex-1 border-r border-ide-hairline overflow-auto scrollbar-ide flex flex-col">
        <div className="h-8 flex items-center px-3 border-b border-ide-hairline bg-ide-bg shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
            Clinical Notes
          </span>
          <span className="ml-2 text-[9px] text-ide-muted bg-ide-surface px-1.5 py-0.5 rounded">
            {processing ? "Analyzing..." : "Highlight text to analyze"}
          </span>
        </div>
        <div className="flex-1 overflow-auto scrollbar-ide">
          {notesText ? (
            <NotesHighlighter text={notesText} onHighlight={onTextHighlight} />
          ) : (
            <div className="flex items-center justify-center h-full text-[11px] text-ide-muted">
              No clinical notes available
            </div>
          )}
        </div>

        {/* Patient & Dentist Summaries */}
        {output?.patient_summary && (
          <div className="border-t border-ide-hairline p-3 shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">
              Patient Summary
            </div>
            <p className="text-xs text-ide-text-2 leading-relaxed">
              {output.patient_summary}
            </p>
          </div>
        )}
      </div>

      {/* Treatment plan side */}
      <div className="w-[280px] overflow-auto scrollbar-ide flex flex-col">
        <div className="h-8 flex items-center px-3 border-b border-ide-hairline bg-ide-bg shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
            Treatment Timeline
          </span>
        </div>

        {output?.timeline && output.timeline.length > 0 ? (
          <TreatmentTimeline
            timeline={output.timeline}
            onEntryClick={(entry) =>
              onTimelineEntryClick?.({
                condition: entry.condition,
                tooth_number: entry.tooth_number,
              })
            }
          />
        ) : (
          <div className="text-[11px] text-ide-muted text-center py-8 px-3">
            {processing
              ? "Processing clinical notes..."
              : "Highlight clinical text to generate treatment timeline"}
          </div>
        )}

        {/* Findings section */}
        {output?.diagnoses && output.diagnoses.length > 0 && (
          <>
            <div className="h-8 flex items-center px-3 border-t border-b border-ide-hairline bg-ide-bg shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
                Diagnoses ({output.diagnoses.length})
              </span>
            </div>
            <FindingsPanel findings={output.diagnoses} />
          </>
        )}
      </div>
    </div>
  );
}
