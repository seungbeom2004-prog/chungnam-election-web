"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import PledgeList from "@/components/dashboard/PledgeList";
import MapEditor from "@/components/dashboard/MapEditor";
import PledgeForm from "@/components/dashboard/PledgeForm";
import CollaborationModal from "@/components/dashboard/CollaborationModal";
import OtherPledgesTab from "@/components/dashboard/OtherPledgesTab";
import type { Pledge } from "@/types";

type ActiveTab = "mine" | "others";

export default function PledgesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ActiveTab>("mine");
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [editingPledge, setEditingPledge] = useState<Pledge | null>(null);
  const [draftPin, setDraftPin] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [collaborationPledge, setCollaborationPledge] = useState<Pledge | null>(null);

  const candidateId = (session?.user as { id?: string })?.id;

  const fetchPledges = useCallback(async () => {
    if (!candidateId) return;
    const res = await fetch(`/api/pledges?candidateId=${candidateId}`);
    const json = await res.json();
    setPledges(json.data ?? json);
  }, [candidateId]);

  useEffect(() => {
    fetchPledges();
  }, [fetchPledges]);

  const handleMapClick = (lat: number, lng: number) => {
    setDraftPin({ lat, lng });
    setEditingPledge(null);
    setShowForm(true);
  };

  const handleEdit = (pledge: Pledge) => {
    setEditingPledge(pledge);
    setDraftPin(null);
    setShowForm(true);
  };

  const handleDelete = async (pledgeId: string) => {
    if (!confirm("이 공약을 삭제하시겠습니까?")) return;
    await fetch(`/api/pledges/${pledgeId}`, { method: "DELETE" });
    fetchPledges();
  };

  const handleToggleVisibility = async (pledge: Pledge) => {
    await fetch(`/api/pledges/${pledge.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pledge, visible: !pledge.visible }),
    });
    fetchPledges();
  };

  const handleFormSubmit = async (data: {
    title: string;
    description: string;
    budget?: string;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    address?: string;
    categoryId?: string;
  }) => {
    if (editingPledge) {
      await fetch(`/api/pledges/${editingPledge.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setDraftPin(null);
    setEditingPledge(null);
    fetchPledges();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setDraftPin(null);
    setEditingPledge(null);
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">공약 관리</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "mine"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground hover:bg-background"
          }`}
        >
          내 공약
        </button>
        <button
          onClick={() => setActiveTab("others")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "others"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground hover:bg-background"
          }`}
        >
          다른 출마자 공약
        </button>
      </div>

      {/* Tab: My Pledges */}
      {activeTab === "mine" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-13rem)]">
          {/* Left: Pledge List */}
          <div className="overflow-y-auto custom-scrollbar">
            <PledgeList
              pledges={pledges}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleVisibility={handleToggleVisibility}
              onManageCollaboration={(pledge) => setCollaborationPledge(pledge)}
            />
          </div>

          {/* Right: Map Editor */}
          <div className="relative rounded-xl overflow-hidden border border-border min-h-[400px]">
            <MapEditor
              pledges={pledges}
              draftPin={draftPin}
              onMapClick={handleMapClick}
            />
            {showForm && (
              <PledgeForm
                pledge={editingPledge}
                draftPin={draftPin}
                onSubmit={handleFormSubmit}
                onClose={handleFormClose}
              />
            )}
          </div>
        </div>
      )}

      {/* Tab: Other Candidates' Pledges */}
      {activeTab === "others" && candidateId && (
        <OtherPledgesTab currentCandidateId={candidateId} />
      )}

      {/* Collaboration Modal */}
      {collaborationPledge && candidateId && (
        <CollaborationModal
          pledge={collaborationPledge}
          currentCandidateId={candidateId}
          onClose={() => {
            setCollaborationPledge(null);
            fetchPledges();
          }}
        />
      )}
    </div>
  );
}
