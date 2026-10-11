import type { Bounds, ViewState } from "@/lib/filters";
import type { Marker } from "@/lib/types";

export interface MapCommand {
  /** Increment to run the command again. */
  id: number;
  kind: "jump" | "fly" | "fit";
  view?: ViewState;
  points?: { latitude: number; longitude: number }[];
}

export interface MapViewProps {
  markers: Marker[];
  selectedSlug: string | null;
  hoveredSlug: string | null;
  onHover: (slug: string | null) => void;
  onSelect: (slug: string | null) => void;
  initialView: ViewState;
  command: MapCommand | null;
  onViewChange: (view: ViewState, bounds: Bounds) => void;
  /** fatal=true: the map cannot render at all (style/WebGL); the list keeps working. */
  onError: (message: string, fatal: boolean) => void;
}
