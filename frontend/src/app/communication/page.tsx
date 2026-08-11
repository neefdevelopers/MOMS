'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function CommunicationPage() {
  return (
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" /> Activity-Based Operational Communication
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Every discussion belongs to an operational entity (Project, Script, Graphic Req, Task, Approval). Personal phone numbers and emails are never exposed.
        </p>
      </div>

      <div className="p-8 bg-card border border-border rounded-xl text-center text-gray-400 space-y-2">
        <p>Operational notes are logged directly within each project tab's <strong>Communication</strong> section.</p>
        <p className="text-gray-500 text-[11px]">Navigate to any project detail workspace to view entity discussion threads.</p>
      </div>
    </div>
  );
}
