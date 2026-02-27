import Image from "next/image";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui";

interface PledgeCardProps {
  pledge: {
    id: string;
    title: string;
    description: string;
    budget: string | null;
    imageUrl: string | null;
    address: string | null;
    createdAt: string;
  };
}

export default function PledgeCard({ pledge }: PledgeCardProps) {
  return (
    <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      {pledge.imageUrl && (
        <div className="relative w-full h-40">
          <Image
            src={pledge.imageUrl}
            alt={pledge.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground mb-1.5 line-clamp-1">
          {pledge.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted line-clamp-3 mb-3">
          {pledge.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {pledge.budget && <Badge variant="primary">{pledge.budget}</Badge>}
          </div>
          <time className="text-xs text-muted">
            {new Date(pledge.createdAt).toLocaleDateString("ko-KR")}
          </time>
        </div>
      </div>
    </Card>
  );
}
