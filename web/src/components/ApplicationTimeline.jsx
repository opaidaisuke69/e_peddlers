import React from 'react';
import { CheckCircle2, Clock, XCircle, ArrowRight, ShieldCheck, UserCheck, Stethoscope, Landmark, Award } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

export default function ApplicationTimeline({ status, currentStage = 1, timeline = [] }) {
  const stages = [
    {
      stage: 1,
      title: 'Admin Verification',
      role: 'City Administrator',
      icon: ShieldCheck,
      key: 'ADMIN',
    },
    {
      stage: 2,
      title: 'Field Inspection',
      role: 'Field Inspector',
      icon: UserCheck,
      key: 'INSPECTOR',
    },
    {
      stage: 3,
      title: 'Sanitary Clearance',
      role: 'Sanitary Inspector',
      icon: Stethoscope,
      key: 'SANITARY',
    },
    {
      stage: 4,
      title: 'Treasury Payment',
      role: 'City Treasury',
      icon: Landmark,
      key: 'TREASURY',
    },
    {
      stage: 5,
      title: 'Permit Verification Release',
      role: 'City Administrator',
      icon: Award,
      key: 'PERMIT_RELEASE',
    },
  ];

  // Helper to determine stage state: 'completed', 'current', 'rejected', 'upcoming'
  const getStageState = (stageNum) => {
    const isFinished = status === 'FINISHED';
    const isRejected = status?.includes('REJECTED');

    if (isFinished) return 'completed';

    if (stageNum < currentStage) {
      return 'completed';
    }

    if (stageNum === currentStage) {
      if (isRejected) return 'rejected';
      return 'current';
    }

    return 'upcoming';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
        <span>Application Approval Workflow</span>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
          Stage {currentStage} of 5
        </span>
      </h3>

      {/* Visual Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative mb-8">
        {stages.map((st, idx) => {
          const state = getStageState(st.stage);
          const Icon = st.icon;

          let cardStyle = 'border-slate-200 bg-slate-50/50 text-slate-400';
          let iconStyle = 'bg-slate-200 text-slate-500';
          let statusText = 'Pending';
          let StatusIcon = Clock;

          if (state === 'completed') {
            cardStyle = 'border-emerald-200 bg-emerald-50/50 text-slate-800 shadow-xs';
            iconStyle = 'bg-emerald-600 text-white shadow-xs';
            statusText = 'Completed';
            StatusIcon = CheckCircle2;
          } else if (state === 'current') {
            cardStyle = 'border-emerald-500 bg-emerald-50/90 text-slate-900 shadow-md ring-2 ring-emerald-500/30';
            iconStyle = 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white animate-pulse shadow-md shadow-emerald-600/30';
            statusText = 'In Progress';
            StatusIcon = Clock;
          } else if (state === 'rejected') {
            cardStyle = 'border-rose-300 bg-rose-50/60 text-rose-900 shadow-sm';
            iconStyle = 'bg-rose-600 text-white';
            statusText = 'Returned';
            StatusIcon = XCircle;
          }

          return (
            <div key={st.stage} className={`relative p-4 rounded-xl border transition-all ${cardStyle}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Step {st.stage}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${iconStyle}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-sm font-bold leading-tight mb-1">{st.title}</h4>
              <p className="text-xs opacity-75 mb-3">{st.role}</p>

              <div className="flex items-center gap-1.5 text-xs font-semibold pt-2 border-t border-slate-200/60">
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{statusText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* History Timeline Stream */}
      {timeline.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Official Activity &amp; Audit Trail
          </h4>
          <div className="space-y-4">
            {timeline.map((item, i) => (
              <div key={item.id || i} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold text-slate-900">{item.stage_name}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(item.created_at)}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    By <strong className="text-slate-800">{item.actor_name}</strong> ({item.actor_role})
                  </div>
                  {item.remarks && (
                    <p className="text-xs text-slate-700 bg-white p-2 rounded mt-2 border border-slate-200/60 italic">
                      "{item.remarks}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
