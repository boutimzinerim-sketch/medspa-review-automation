import { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface TableColumn<T> { key: keyof T | string; header: string; sortable?: boolean; render?: (row: T) => ReactNode; width?: string; }
export interface SortState { key: string; direction: 'asc' | 'desc'; }
interface TableProps<T> { columns: TableColumn<T>[]; data: T[]; sortState?: SortState; onSort?: (key: string) => void; emptyMessage?: string; isLoading?: boolean; }

export function Table<T extends Record<string, unknown>>({ columns, data, sortState, onSort, emptyMessage = 'No records found.', isLoading = false }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-black/[0.06]">
            {columns.map((col) => (
              <th key={String(col.key)}
                className={[
                  'px-6 py-4 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.1em] whitespace-nowrap',
                  col.width || '',
                  col.sortable ? 'cursor-pointer hover:text-[#6B7280] transition-colors select-none' : '',
                ].join(' ')}
                onClick={col.sortable && onSort ? () => onSort(String(col.key)) : undefined}>
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortState?.key === String(col.key)
                      ? sortState.direction === 'asc' ? <ChevronUp size={13} className="text-[#FF5500]" /> : <ChevronDown size={13} className="text-[#FF5500]" />
                      : <ChevronsUpDown size={13} className="opacity-25" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={columns.length} className="px-6 py-20 text-center text-[#C4C4C4] text-[13px]">Loading...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-6 py-20 text-center text-[13px] text-[#C4C4C4]">{emptyMessage}</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-b border-black/[0.03] last:border-0 hover:bg-[#F5F0EA]/40 transition-colors duration-150">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4 text-[13px] text-[#4B5563]">
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '-')}
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
