import { useEffect } from 'react';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { BookViewer } from '../Scrapbook/BookViewer';
import { EmptyState } from './ui';

export function PreviewScreen() {
  const doc = useAppStore((state) => state.doc);
  const goToPage = useAppStore((state) => state.goToPage);

  useEffect(() => {
    goToPage(0);
  }, [goToPage]);

  if (!doc || !doc.pages.length) {
    return (
      <div className="admin-content">
        <EmptyState
          icon="pages"
          title="Nothing to preview yet"
          body="Add at least one page and then come back. The preview reads straight from your draft."
          action={
            <a href="#/admin/pages" className="btn btn-primary inline-flex min-h-10">
              Go to pages
            </a>
          }
        />
      </div>
    );
  }

  return <BookViewer chrome="preview" onExit={() => navigate('/admin/dashboard')} />;
}
