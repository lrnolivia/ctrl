import {featureIcon} from '../../../../packages/shared-ui/feature-icons.js';

export function FeatureHeader({ feature, title, subtitle }: { feature: string; title: string; subtitle: string }) {
  return (
    <header className="page-heading feature-heading" data-feature={feature}>
      <img className="feature-mark" src={featureIcon(feature) || undefined} alt="" />
      <div className="feature-heading-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
