import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, UsersRound, LayoutGrid } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { leaveRequests } from '@/data/mock/dashboard';
import { navigation } from '@/data/navigation';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/features/auth/hooks/useCan';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const can = useCan();
  const search = query.trim().toLocaleLowerCase();
  const results = search
    ? [
        ...leaveRequests
          .filter(
            (request) =>
              can('employee.read') &&
              `${request.employee} ${request.department}`
                .toLowerCase()
                .includes(search),
          )
          .map((request) => ({
            id: request.id,
            label: request.employee,
            detail: `${request.department} · employee`,
            path: '/employees',
            icon: UsersRound,
          })),
        ...navigation
          .filter(
            (item) =>
              can(item.permission) && item.label.toLowerCase().includes(search),
          )
          .map((item) => ({
            id: item.path,
            label: item.label,
            detail: 'Module',
            path: item.path,
            icon: LayoutGrid,
          })),
      ].slice(0, 7)
    : [];
  return (
    <div
      className="global-search"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setQuery('');
          event.stopPropagation();
        }
      }}
    >
      <SearchInput
        id="global-search"
        label="Search employees and modules"
        placeholder="Search employees and modules..."
        value={query}
        onChange={setQuery}
      />
      <span role="status" className="sr-only">
        {focused && search ? `${results.length} results` : ''}
      </span>
      <AnimatePresence mode="wait">
        {focused && search && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="search-results"
          >
            <p className="search-results-label">Search CampusHR</p>
            {results.length ? (
              <ul>
                {results.map(({ id, label, detail, path, icon: Icon }) => (
                  <li key={id}>
                    <Link
                      to={path}
                      onClick={() => {
                        setQuery('');
                        setFocused(false);
                      }}
                    >
                      <Icon aria-hidden="true" />
                      <span>
                        <strong>{label}</strong>
                        <small>{detail}</small>
                      </span>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No matching results"
                description="Try a name or a module, e.g. Leave."
                actionLabel="Clear search"
                onAction={() => setQuery('')}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
