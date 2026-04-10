import { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ---- Column definition ----
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  width?: string;
}

// ---- Sort state ----
export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  sortState?: SortState;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  sortState,
  onSort,
  emptyMessage = 'No records found.',
  isLoading = false,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-white/8 bg-white/3">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={[
                  'px-4 py-3 font-medium text-white/50 whitespace-nowrap',
                  col.width || '',
                  col.sortable ? 'cursor-pointer hover:text-white transition-colors' : '',
                ].join(' ')}
                onClick={col.sortable && onSort ? () => onSort(String(col.key)) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortState?.key === String(col.key) ? (
                      sortState.direction === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )
                    ) : (
                      <ChevronsUpDown size={14} className="opacity-30" />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-white/40">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-white/40">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-white/80">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
