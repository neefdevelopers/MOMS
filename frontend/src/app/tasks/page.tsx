'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CheckSquare, AlertTriangle, Plus, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reassignment Modal state
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [targetUserId, setTargetUserId] = useState('');

  const loadData = async () => {
    try {
      const [resTasks, resCap] = await Promise.all([
        fetchApi('/tasks'),
        fetchApi('/tasks/capacity/overview'),
      ]);
      setTasks(resTasks);
      setCapacity(resCap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReassignDrawer = async (task: any) => {
    setSelectedTask(task);
    try {
      const rec = await fetchApi(`/tasks/${task.id}/reassign-recommendations`);
      setRecommendations(rec);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteReassign = async () => {
    if (!targetUserId || !selectedTask) return;
    try {
      await fetchApi(`/tasks/${selectedTask.id}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedUserIds: [targetUserId] }),
      });
      setSelectedTask(null);
      setRecommendations(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign task');
    }
  };

  const handleUpdateProgress = async (taskId: string, newPercentage: number) => {
    try {
      await fetchApi(`/tasks/${taskId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          completionPercentage: newPercentage,
          status: newPercentage === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-400" /> Operational Task & Workload Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Only Media Manager can create/reassign tasks. Workload Engine recommends alternatives for overloaded staff.
          </p>
        </div>
      </div>

      {/* Workload Capacity Section */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Live Employee Capacity Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {capacity.map((emp) => (
            <div
              key={emp.userId}
              className={`p-3 rounded-lg border ${
                emp.status === 'Overloaded' ? 'bg-red-950/30 border-red-800/50' : 'bg-gray-900 border-gray-800'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-white">{emp.name}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    emp.status === 'Overloaded' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {emp.status}
                </span>
              </div>
              <div className="text-gray-400">Assigned: {emp.assignedHours}h / {emp.capacityHours}h ({emp.workloadPercentage}%)</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Tasks...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-4">Task ID & Title</th>
                <th className="p-4">Project / Entity</th>
                <th className="p-4">Assigned Staff</th>
                <th className="p-4">Hours</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-4">
                    <span className="font-mono text-blue-400 font-bold block">{task.taskId}</span>
                    <span className="font-bold text-white">{task.title}</span>
                  </td>

                  <td className="p-4 text-gray-400">
                    <div>{task.project?.name}</div>
                    <div className="text-[10px] text-gray-500">{task.brand?.name}</div>
                  </td>

                  <td className="p-4">
                    {task.assignedEmployees?.map((a: any) => (
                      <span key={a.id} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-[11px] block w-max my-0.5 font-semibold">
                        {a.user?.name}
                      </span>
                    ))}
                  </td>

                  <td className="p-4 font-mono font-bold text-gray-300">{task.estimatedHours}h</td>

                  <td className="p-4 w-40">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="25"
                        value={task.completionPercentage}
                        onChange={(e) => handleUpdateProgress(task.id, parseInt(e.target.value))}
                        className="w-full"
                      />
                      <span className="font-bold text-[11px] w-8">{task.completionPercentage}%</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-300 rounded font-semibold text-[10px]">
                      {task.status}
                    </span>
                  </td>

                  <td className="p-4">
                    {user?.role === 'MEDIA_MANAGER' && (
                      <button
                        onClick={() => openReassignDrawer(task)}
                        className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded font-semibold text-[11px] flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reassign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reassignment Recommendations Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">Reassign Task: {selectedTask.taskId}</h3>
            <p className="text-gray-400">Current Assigned: <span className="text-white font-bold">{recommendations?.currentAssigned?.join(', ')}</span></p>

            <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-2">
              <h4 className="font-bold text-amber-400">Smart Workload Recommendations</h4>
              <div className="space-y-2">
                {recommendations?.recommendations?.map((rec: any) => (
                  <label
                    key={rec.userId}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer ${
                      targetUserId === rec.userId ? 'bg-blue-600/20 border-blue-500' : 'bg-gray-950 border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="reassignStaff"
                        value={rec.userId}
                        checked={targetUserId === rec.userId}
                        onChange={() => setTargetUserId(rec.userId)}
                      />
                      <div>
                        <div className="font-bold text-white">{rec.name}</div>
                        <div className="text-[10px] text-gray-400">{rec.reason}</div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-400">{rec.remainingHours}h left</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReassign}
                disabled={!targetUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                Confirm Manager Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
