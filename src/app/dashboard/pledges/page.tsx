"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import PledgeList from "@/components/dashboard/PledgeList";
import MapEditor from "@/components/dashboard/MapEditor";
import PledgeForm from "@/components/dashboard/PledgeForm";
import CollaborationModal from "@/components/dashboard/CollaborationModal";
import OtherPledgesTab from "@/components/dashboard/OtherPledgesTab";
import { Button, Input, Textarea } from "@/components/ui";
import type { Pledge } from "@/types";

type ActiveTab = "mine" | "bylaws" | "others";

// ── Bylaws form (inline — no map needed) ──────────────────────────
function BylawsForm({
  editingBylaws,
  onSubmit,
  onClose,
}: {
  editingBylaws: Pledge | null;
  onSubmit: (data: { title: string; description: string; budget?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(editingBylaws?.title || "");
  const [description, setDescription] = useState(editingBylaws?.description || "");
  const [budget, setBudget] = useState(editingBylaws?.budget || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ title, description, budget: budget || undefined });
    setSubmitting(false);
  };

  return (
    <div className="max-w-lg border border-border rounded-xl bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">
          {editingBylaws ? "조례 수정" : "새 조례 등록"}
        </h3>
        <button onClick={onClose} className="text-muted hover:text-foreground transition-colors text-xs">
          취소
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="조례 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 천안시 보육 지원 조례 개정안"
          required
        />
        <Textarea
          label="상세 설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="조례의 내용과 기대 효과를 설명하세요"
          required
        />
        <Input
          label="예산 (선택)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="예: 3억 원"
        />
        <div className="flex gap-2 pt-2">
          <Button type="submit" size="sm" className="flex-1" disabled={submitting}>
            {submitting ? "저장 중..." : editingBylaws ? "수정" : "등록"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}

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

  // Bylaws state
  const [bylaws, setBylaws] = useState<Pledge[]>([]);
  const [showBylawsForm, setShowBylawsForm] = useState(false);
  const [editingBylaws, setEditingBylaws] = useState<Pledge | null>(null);

  const candidateId = (session?.user as { id?: string })?.id;
  const [candidatePin, setCandidatePin] = useState<{ lat: number; lng: number } | null>(null);
  const [candidateEligibility, setCandidateEligibility] = useState<{
    caucusStatus: string | null;
    candidateStatus: string | null;
  } | null>(null);

  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/candidates/${candidateId}`)
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? json;
        if (data.pinLat != null && data.pinLng != null) {
          setCandidatePin({ lat: data.pinLat, lng: data.pinLng });
        }
        setCandidateEligibility({
          caucusStatus: data.caucusStatus ?? null,
          candidateStatus: data.candidateStatus ?? null,
        });
      })
      .catch(() => {});
  }, [candidateId]);

  // Pledges are publicly visible only when the candidate is officially registered:
  // caucusStatus = "공천 확정" AND candidateStatus IN ("예비후보자", "후보자")
  const isPledgeVisible =
    candidateEligibility !== null &&
    candidateEligibility.caucusStatus === "공천 확정" &&
    ["예비후보자", "후보자"].includes(candidateEligibility.candidateStatus ?? "");

  const fetchPledges = useCallback(async () => {
    if (!candidateId) return;
    const res = await fetch(`/api/pledges?candidateId=${candidateId}&pledgeType=map`);
    const json = await res.json();
    setPledges(json.data ?? json);
  }, [candidateId]);

  const fetchBylaws = useCallback(async () => {
    if (!candidateId) return;
    const res = await fetch(`/api/pledges?candidateId=${candidateId}&pledgeType=bylaws`);
    const json = await res.json();
    setBylaws(json.data ?? json);
  }, [candidateId]);

  useEffect(() => {
    fetchPledges();
    fetchBylaws();
  }, [fetchPledges, fetchBylaws]);

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
    if (!confirm("이 항목을 삭제하시겠습니까?")) return;
    await fetch(`/api/pledges/${pledgeId}`, { method: "DELETE" });
    fetchPledges();
    fetchBylaws();
  };

  const handleToggleVisibility = async (pledge: Pledge) => {
    await fetch(`/api/pledges/${pledge.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pledge, visible: !pledge.visible }),
    });
    fetchPledges();
    fetchBylaws();
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
        body: JSON.stringify({ ...data, pledgeType: "map" }),
      });
    }
    setShowForm(false);
    setDraftPin(null);
    setEditingPledge(null);
    fetchPledges();
  };

  const handleBylawsSubmit = async (data: { title: string; description: string; budget?: string }) => {
    const body = {
      ...data,
      latitude: 0,
      longitude: 0,
      pledgeType: "bylaws",
    };
    if (editingBylaws) {
      await fetch(`/api/pledges/${editingBylaws.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setShowBylawsForm(false);
    setEditingBylaws(null);
    fetchBylaws();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setDraftPin(null);
    setEditingPledge(null);
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-4">공약 관리</h1>

      {/* Eligibility warning — shown when status is not yet confirmed */}
      {candidateEligibility !== null && !isPledgeVisible && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed">
          <span className="text-base shrink-0">⚠️</span>
          <p>
            공천이 확정되지 않았거나, 아직 예비 후보자 등록을 선관위에 하지 않으신 출마자분들은 선거법상 공약이 노출되지 않습니다. 양해바랍니다.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(["mine", "bylaws", "others"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground hover:bg-background"
            }`}
          >
            {tab === "mine" ? "내 공약" : tab === "bylaws" ? "조례" : "다른 출마자 공약"}
          </button>
        ))}
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
              pinLat={candidatePin?.lat ?? null}
              pinLng={candidatePin?.lng ?? null}
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

      {/* Tab: Bylaws (조례) */}
      {activeTab === "bylaws" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">지도에 표시되지 않는 조례 공약을 관리합니다.</p>
            <Button
              size="sm"
              onClick={() => { setShowBylawsForm(true); setEditingBylaws(null); }}
            >
              새 조례 등록
            </Button>
          </div>

          {showBylawsForm && (
            <BylawsForm
              editingBylaws={editingBylaws}
              onSubmit={handleBylawsSubmit}
              onClose={() => { setShowBylawsForm(false); setEditingBylaws(null); }}
            />
          )}

          {bylaws.length === 0 && !showBylawsForm ? (
            <div className="text-center py-12 text-muted">
              <p className="text-sm">등록된 조례가 없습니다.</p>
              <p className="text-xs mt-1">조례는 지도에 표시되지 않고, 후보자 프로필에서 확인할 수 있습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bylaws.map((b) => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 p-4 border border-border rounded-xl bg-surface"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-base">📜</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{b.title}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{b.description}</p>
                    {b.budget && (
                      <p className="text-xs text-primary mt-1">{b.budget}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingBylaws(b); setShowBylawsForm(true); }}
                      className="px-2 py-1 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="px-2 py-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
