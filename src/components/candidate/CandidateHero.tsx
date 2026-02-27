import Image from "next/image";
import { Badge } from "@/components/ui";

interface CandidateHeroProps {
  candidate: {
    name: string;
    district: string;
    profileImage: string | null;
    slogan: string | null;
    party: string;
  };
}

export default function CandidateHero({ candidate }: CandidateHeroProps) {
  return (
    <div className="relative bg-gradient-to-br from-primary to-primary-hover overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      <div className="relative max-w-screen-xl mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Profile Image */}
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/20 border-4 border-white/50 overflow-hidden shrink-0">
            {candidate.profileImage ? (
              <Image
                src={candidate.profileImage}
                alt={candidate.name}
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-4xl font-bold">
                  {candidate.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Badge className="bg-white/20 text-white">{candidate.party}</Badge>
              <Badge className="bg-white/20 text-white">{candidate.district}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {candidate.name}
            </h1>
            {candidate.slogan && (
              <p className="text-lg text-white/90 max-w-lg">
                {candidate.slogan}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
