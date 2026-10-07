import { countVisual } from "../../../../packages/shared-ui/presentation.js";
import { glyph, telemetryGlyph } from "../../../../packages/shared-ui/glyphs.js";

export type SignalCardData = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone?: string;
  total?: number;
  totalLabel?: string;
};

export function SignalDeck({ cards, feature = "relay",onInspect }: { cards: SignalCardData[]; feature?: string;onInspect?:()=>void }) {
  return (
    <section className="signal-deck" data-feature={feature} aria-label="live summary">
      <div className="signal-track">
        {cards.map(card => (
          <article role={onInspect?"button":undefined} tabIndex={onInspect?0:undefined} aria-label={onInspect?"inspect "+card.label:undefined} onClick={onInspect} onKeyDown={event=>{if(onInspect&&["Enter"," "].includes(event.key)){event.preventDefault();onInspect();}}} className="signal-card" data-tone={card.tone || "quiet"} data-signal-id={card.id} key={card.id}>
            <span className="signal-mark" dangerouslySetInnerHTML={{ __html: glyph(telemetryGlyph(card.id)) }} />
            <span className="signal-label">{card.label}</span>
            <strong key={"value-"+card.value} data-value-kind={/^[\d.,%]+$/.test(card.value) ? "number" : "text"}>{card.value}</strong>
            <p>{card.detail}</p>
            <span className="signal-visual-slot" key={"visual-"+card.value} dangerouslySetInnerHTML={{ __html: countVisual(card.value, card.total, card.totalLabel) }} />
          </article>
        ))}
      </div>
    </section>
  );
}

