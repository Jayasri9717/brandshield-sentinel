import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export type DataColumn<Row> = { key: string; title: string; render: (row: Row) => ReactNode };

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  emptyTitle = "No results",
  emptyMessage = "Try changing the filters or provide candidate data.",
}: {
  rows: Row[];
  columns: DataColumn<Row>[];
  rowKey: (row: Row) => string;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (!rows.length) return <EmptyState title={emptyTitle}>{emptyMessage}</EmptyState>;
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.title}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
