export type SortField =
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'priority'
  | 'status'
  | 'deadline'
  | 'dueDate'
  | 'shootDate'
  | 'alphabetical';

export type SortOrder = 'asc' | 'desc';

export const PRIORITY_WEIGHTS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  HIGH_PRIORITY: 3,
  NORMAL_PRIORITY: 2,
};

/**
 * Standardized generic multi-type table sorter
 */
export function sortData<T extends Record<string, any>>(
  items: T[],
  sortBy: SortField | string,
  sortOrder: SortOrder = 'asc'
): T[] {
  if (!items || items.length <= 1) return items;

  return [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
      case 'alphabetical': {
        const valA = (a.name || a.title || a.subject || a.fileName || a.equipmentId || '').toString().toLowerCase();
        const valB = (b.name || b.title || b.subject || b.fileName || b.equipmentId || '').toString().toLowerCase();
        comparison = valA.localeCompare(valB);
        break;
      }

      case 'priority': {
        const weightA = PRIORITY_WEIGHTS[(a.priority || '').toUpperCase()] || 0;
        const weightB = PRIORITY_WEIGHTS[(b.priority || '').toUpperCase()] || 0;
        comparison = weightA - weightB;
        break;
      }

      case 'status': {
        const statusA = (a.status || a.availability || a.employmentStatus || a.blockerStatus || '').toString().toLowerCase();
        const statusB = (b.status || b.availability || b.employmentStatus || b.blockerStatus || '').toString().toLowerCase();
        comparison = statusA.localeCompare(statusB);
        break;
      }

      case 'deadline':
      case 'dueDate': {
        const dateA = a.dueDate || a.estimatedCompletionDate || a.shootDate || a.expectedReturnDate || a.endDate;
        const dateB = b.dueDate || b.estimatedCompletionDate || b.shootDate || b.expectedReturnDate || b.endDate;
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        comparison = timeA - timeB;
        break;
      }

      case 'updatedAt':
      case 'lastUpdated': {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
        break;
      }

      case 'createdAt':
      case 'dateCreated':
      default: {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.shootDate ? new Date(a.shootDate).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.shootDate ? new Date(b.shootDate).getTime() : 0;
        comparison = timeA - timeB;
        break;
      }
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}
