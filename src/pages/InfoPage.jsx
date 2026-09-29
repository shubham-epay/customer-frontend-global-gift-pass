import { useParams } from 'react-router-dom';
import { INFO_PAGES } from '../config/site';
import { EmptyState } from '../components/States';

/** Placeholder for footer/header pages that have no content source yet. */
export default function InfoPage() {
  const { slug } = useParams();
  const title = INFO_PAGES[slug];
  return (
    <div className="container section">
      {title
        ? <EmptyState title={title} text="This page is coming soon." action="Back to home" />
        : <EmptyState title="Page not found" action="Go home" />}
    </div>
  );
}
