import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface GlobalSearchResultItem {
  id: string;
  name: string; // Name
  title: string; // Backward compatibility alias for Name
  entityType: string; // Entity Type
  internalId: string; // Internal ID
  code?: string; // Backward compatibility alias for internalId
  status: string; // Current Status
  relatedClient: string; // Related Client
  relatedBrand: string; // Related Brand
  lastUpdatedDate: string; // Last Updated Date
  module: string; // Module Category
  url: string; // Direct Navigation URL
  subtitle: string;
  priority?: string;
  badge?: string;
  relevanceScore?: number;
  matchedTokensCount?: number;
}

export interface GlobalSearchResponse {
  query: string;
  tokens: string[];
  totalResults: number;
  results: Record<string, GlobalSearchResultItem[]>;
  modulesSearched: string[];
  searchCriteriaSupported: string[];
}

export interface ISearchProvider {
  readonly moduleKey: string;
  readonly moduleDisplayName: string;
  search(query: string, tokens: string[], user: { id: string; role: string; email?: string }): Promise<GlobalSearchResultItem[]>;
}

export function calculateRelevance(
  item: { title?: string; name?: string; subtitle?: string; code?: string; internalId?: string; status?: string; remarks?: string },
  tokens: string[],
  rawQuery: string
): { score: number; matchedTokens: number } {
  let score = 0;
  let matchedTokens = 0;
  const qLower = rawQuery.toLowerCase();
  const titleLower = (item.name || item.title || '').toLowerCase();
  const subLower = (item.subtitle || '').toLowerCase();
  const codeLower = (item.internalId || item.code || '').toLowerCase();
  const remarksLower = (item.remarks || '').toLowerCase();

  // 1. Exact Full Query Matches
  if (codeLower === qLower) score += 100;
  else if (codeLower.startsWith(qLower)) score += 60;

  if (titleLower === qLower) score += 80;
  else if (titleLower.startsWith(qLower)) score += 50;
  else if (titleLower.includes(qLower)) score += 35;

  // 2. Token-by-Token Multi-Keyword Evaluation
  let allTokensFound = true;
  for (const token of tokens) {
    let tokenMatched = false;

    if (titleLower.includes(token)) {
      score += titleLower.startsWith(token) ? 25 : 15;
      tokenMatched = true;
    }
    if (codeLower.includes(token)) {
      score += 20;
      tokenMatched = true;
    }
    if (subLower.includes(token)) {
      score += 10;
      tokenMatched = true;
    }
    if (remarksLower.includes(token)) {
      score += 6;
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTokens++;
    } else {
      allTokensFound = false;
    }
  }

  // 3. Multi-Keyword Completeness Bonus
  if (tokens.length > 1 && allTokensFound) {
    score += 40;
  }

  // 4. Status Priority Bonus
  const statusUpper = (item.status || '').toUpperCase();
  if (statusUpper === 'ACTIVE' || statusUpper === 'IN_PROGRESS' || statusUpper === 'AVAILABLE') {
    score += 5;
  }

  return { score, matchedTokens };
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly providers = new Map<string, ISearchProvider>();

  public readonly supportedCriteria = [
    'Internal ID',
    'Display Name',
    'Project Code',
    'Script Code',
    'Graphic Requirement Code',
    'Equipment Code',
    'Employee Name',
    'Client Name',
    'Brand Name',
    'Product Name',
    'Keywords',
    'Remarks',
  ];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.registerProvider(new ClientsSearchProvider(this.prisma));
    this.registerProvider(new BrandsSearchProvider(this.prisma));
    this.registerProvider(new ProductsSearchProvider(this.prisma));
    this.registerProvider(new CalendarEventsSearchProvider(this.prisma));
    this.registerProvider(new ProjectsSearchProvider(this.prisma));
    this.registerProvider(new ScriptsSearchProvider(this.prisma));
    this.registerProvider(new GraphicRequirementsSearchProvider(this.prisma));
    this.registerProvider(new TasksSearchProvider(this.prisma));
    this.registerProvider(new EmployeesSearchProvider(this.prisma));
    this.registerProvider(new EquipmentSearchProvider(this.prisma));
    this.registerProvider(new CommunicationsSearchProvider(this.prisma));
    this.registerProvider(new ReportsSearchProvider());
    this.registerProvider(new DocumentsSearchProvider(this.prisma));
  }

  registerProvider(provider: ISearchProvider) {
    this.providers.set(provider.moduleKey, provider);
  }

  getRegisteredModules(): string[] {
    return Array.from(this.providers.values()).map((p) => p.moduleDisplayName);
  }

  async searchAll(query: string, user: { id: string; role: string; email?: string }): Promise<GlobalSearchResponse> {
    if (!query || query.trim().length === 0) {
      return {
        query: '',
        tokens: [],
        totalResults: 0,
        results: {},
        modulesSearched: this.getRegisteredModules(),
        searchCriteriaSupported: this.supportedCriteria,
      };
    }

    const q = query.trim();
    const tokens = q
      .toLowerCase()
      .split(/[\s,+-]+/)
      .filter((t) => t.length > 0);

    const providerList = Array.from(this.providers.values());
    const searchPromises = providerList.map(async (provider) => {
      try {
        const items = await provider.search(q, tokens, user);
        const rankedItems = items
          .map((item) => {
            const { score, matchedTokens } = calculateRelevance(item, tokens, q);
            return { ...item, relevanceScore: score, matchedTokensCount: matchedTokens };
          })
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        return { displayName: provider.moduleDisplayName, items: rankedItems };
      } catch (err: any) {
        console.warn(`[SearchProvider Error] Module ${provider.moduleDisplayName}:`, err.message);
        return { displayName: provider.moduleDisplayName, items: [] };
      }
    });

    const searchResultsList = await Promise.all(searchPromises);
    const results: Record<string, GlobalSearchResultItem[]> = {};

    for (const res of searchResultsList) {
      if (res.items && res.items.length > 0) {
        results[res.displayName] = res.items;
      }
    }

    const totalResults = Object.values(results).reduce((acc, list) => acc + list.length, 0);

    return {
      query: q,
      tokens,
      totalResults,
      results,
      modulesSearched: this.getRegisteredModules(),
      searchCriteriaSupported: this.supportedCriteria,
    };
  }

  /**
   * Module-Scoped Quick Search:
   * Searches only within the specified module (e.g. projects, tasks, equipment, employees)
   */
  async searchModule(
    moduleKey: string,
    query: string,
    user: { id: string; role: string; email?: string }
  ): Promise<GlobalSearchResponse> {
    const key = (moduleKey || '').toLowerCase().trim();
    const provider =
      this.providers.get(key) ||
      Array.from(this.providers.values()).find(
        (p) => p.moduleDisplayName.toLowerCase() === key || p.moduleKey.toLowerCase() === key
      );

    if (!provider) {
      return {
        query: query || '',
        tokens: [],
        totalResults: 0,
        results: {},
        modulesSearched: [],
        searchCriteriaSupported: this.supportedCriteria,
      };
    }

    const q = (query || '').trim();
    const tokens = q
      .toLowerCase()
      .split(/[\s,+-]+/)
      .filter((t) => t.length > 0);

    const items = await provider.search(q, tokens, user);
    const rankedItems = items
      .map((item) => {
        const { score, matchedTokens } = calculateRelevance(item, tokens, q);
        return { ...item, relevanceScore: score, matchedTokensCount: matchedTokens };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return {
      query: q,
      tokens,
      totalResults: rankedItems.length,
      results: { [provider.moduleDisplayName]: rankedItems },
      modulesSearched: [provider.moduleDisplayName],
      searchCriteriaSupported: this.supportedCriteria,
    };
  }

  /**
   * Advanced Multi-Condition Search:
   * Combines multiple criteria (Brand + Employee, Project + Status, Date Range + Client, Product + Language, Equipment + Status)
   */
  async advancedSearch(
    dto: {
      keywords?: string;
      client?: string;
      clientId?: string;
      brand?: string;
      brandId?: string;
      product?: string;
      productId?: string;
      project?: string;
      projectId?: string;
      employee?: string;
      employeeId?: string;
      equipment?: string;
      equipmentId?: string;
      status?: string;
      language?: string;
      dateFrom?: string;
      dateTo?: string;
      priority?: string;
      module?: string;
    },
    user: { id: string; role: string; email?: string }
  ): Promise<GlobalSearchResponse> {
    const isManager = user.role === 'MEDIA_MANAGER' || user.role === 'TECHNICAL_MANAGER' || user.role === 'ADMIN';
    const results: Record<string, GlobalSearchResultItem[]> = {};

    // Parallel execution across relevant modules based on filter combinations
    const promises: Promise<void>[] = [];

    // 1. Projects Advanced Filter (e.g. Project + Status, Date Range + Client, Brand + Employee)
    if (!dto.module || dto.module === 'ALL' || dto.module === 'projects') {
      promises.push(
        (async () => {
          const where: any = {};
          if (dto.status && dto.status !== 'ALL') where.status = dto.status;
          if (dto.priority && dto.priority !== 'ALL') where.priority = dto.priority;
          if (dto.clientId) where.clientId = dto.clientId;
          else if (dto.client) where.client = { name: { contains: dto.client } };
          if (dto.brandId) where.brandId = dto.brandId;
          else if (dto.brand) where.brand = { name: { contains: dto.brand } };
          if (dto.productId) where.productId = dto.productId;
          else if (dto.product) where.product = { name: { contains: dto.product } };
          if (dto.projectId) where.id = dto.projectId;
          else if (dto.project) where.name = { contains: dto.project };
          if (dto.employeeId) where.assignedTeam = { some: { userId: dto.employeeId } };
          else if (dto.employee) where.assignedTeam = { some: { user: { name: { contains: dto.employee } } } };

          if (dto.dateFrom || dto.dateTo) {
            where.shootDate = {};
            if (dto.dateFrom) where.shootDate.gte = new Date(dto.dateFrom);
            if (dto.dateTo) where.shootDate.lte = new Date(dto.dateTo);
          }

          if (dto.keywords) {
            where.OR = [
              { name: { contains: dto.keywords } },
              { projectId: { contains: dto.keywords } },
              { shootLocation: { contains: dto.keywords } },
              { notes: { contains: dto.keywords } },
            ];
          }

          if (!isManager) {
            where.assignedTeam = { some: { userId: user.id } };
          }

          const records = await this.prisma.shootProject.findMany({
            where,
            include: { client: { select: { name: true } }, brand: { select: { name: true } } },
            take: 12,
            orderBy: { updatedAt: 'desc' },
          });

          if (records.length > 0) {
            results['Projects'] = records.map((p) => ({
              id: p.id,
              entityType: 'Project',
              name: p.name,
              title: p.name,
              internalId: p.projectId || `PRJ-${p.id.substring(0, 6).toUpperCase()}`,
              code: p.projectId,
              status: p.status,
              relatedClient: p.client?.name || '—',
              relatedBrand: p.brand?.name || '—',
              lastUpdatedDate: (p.updatedAt || p.createdAt).toISOString(),
              priority: p.priority,
              module: 'Projects',
              url: `/projects?projectId=${p.id}`,
              subtitle: `${p.projectId || 'PRJ'} • Shoot: ${p.shootLocation} • ${p.status}`,
            }));
          }
        })()
      );
    }

    // 2. Tasks Advanced Filter (e.g. Brand + Employee, Project + Status, Priority + Status)
    if (!dto.module || dto.module === 'ALL' || dto.module === 'tasks') {
      promises.push(
        (async () => {
          const where: any = {};
          if (dto.status && dto.status !== 'ALL') where.status = dto.status;
          if (dto.priority && dto.priority !== 'ALL') where.priority = dto.priority;
          if (dto.projectId) where.projectId = dto.projectId;
          else if (dto.project) where.project = { name: { contains: dto.project } };
          if (dto.brandId) where.brandId = dto.brandId;
          else if (dto.brand) where.brand = { name: { contains: dto.brand } };
          if (dto.clientId) where.clientId = dto.clientId;
          else if (dto.client) where.client = { name: { contains: dto.client } };
          if (dto.employeeId) where.assignedEmployees = { some: { userId: dto.employeeId } };
          else if (dto.employee) where.assignedEmployees = { some: { user: { name: { contains: dto.employee } } } };

          if (dto.dateFrom || dto.dateTo) {
            where.dueDate = {};
            if (dto.dateFrom) where.dueDate.gte = new Date(dto.dateFrom);
            if (dto.dateTo) where.dueDate.lte = new Date(dto.dateTo);
          }

          if (dto.keywords) {
            where.OR = [
              { title: { contains: dto.keywords } },
              { taskId: { contains: dto.keywords } },
              { description: { contains: dto.keywords } },
            ];
          }

          if (!isManager) {
            where.assignedEmployees = { some: { userId: user.id } };
          }

          const records = await this.prisma.task.findMany({
            where,
            include: {
              project: { select: { name: true } },
              client: { select: { name: true } },
              brand: { select: { name: true } },
              assignedEmployees: { include: { user: { select: { name: true } } } },
            },
            take: 12,
            orderBy: { updatedAt: 'desc' },
          });

          if (records.length > 0) {
            results['Tasks'] = records.map((t) => {
              const assignees = t.assignedEmployees.map((a) => a.user.name).join(', ') || 'Unassigned';
              return {
                id: t.id,
                entityType: 'Task',
                name: t.title,
                title: t.title,
                internalId: t.taskId || `TSK-${t.id.substring(0, 6).toUpperCase()}`,
                code: t.taskId,
                status: t.status,
                relatedClient: t.client?.name || '—',
                relatedBrand: t.brand?.name || '—',
                lastUpdatedDate: (t.updatedAt || t.createdAt).toISOString(),
                priority: t.priority,
                module: 'Tasks',
                url: `/tasks?taskId=${t.id}`,
                subtitle: `${t.taskId || 'TSK'} • Project: ${t.project?.name || 'Task'} • Assignee: ${assignees}`,
              };
            });
          }
        })()
      );
    }

    // 3. Scripts Advanced Filter (e.g. Product + Language, Brand + Language, Client + Status)
    if (!dto.module || dto.module === 'ALL' || dto.module === 'scripts') {
      promises.push(
        (async () => {
          const where: any = {};
          if (dto.language && dto.language !== 'ALL') where.language = { contains: dto.language };
          if (dto.status && dto.status !== 'ALL') where.status = dto.status;
          if (dto.priority && dto.priority !== 'ALL') where.priority = dto.priority;
          if (dto.productId) where.productId = dto.productId;
          else if (dto.product) where.product = { name: { contains: dto.product } };
          if (dto.brandId) where.brandId = dto.brandId;
          else if (dto.brand) where.brand = { name: { contains: dto.brand } };
          if (dto.clientId) where.clientId = dto.clientId;
          else if (dto.client) where.client = { name: { contains: dto.client } };
          if (dto.employeeId) where.scriptAssignments = { some: { userId: dto.employeeId } };
          else if (dto.employee) where.scriptAssignments = { some: { user: { name: { contains: dto.employee } } } };

          if (dto.keywords) {
            where.OR = [
              { name: { contains: dto.keywords } },
              { scriptId: { contains: dto.keywords } },
              { description: { contains: dto.keywords } },
              { objective: { contains: dto.keywords } },
            ];
          }

          if (!isManager) {
            where.scriptAssignments = { some: { userId: user.id } };
          }

          const records = await this.prisma.script.findMany({
            where,
            include: {
              project: { select: { name: true } },
              client: { select: { name: true } },
              brand: { select: { name: true } },
              product: { select: { name: true } },
            },
            take: 12,
            orderBy: { updatedAt: 'desc' },
          });

          if (records.length > 0) {
            results['Scripts'] = records.map((s) => ({
              id: s.id,
              entityType: 'Script',
              name: s.name,
              title: s.name,
              internalId: s.scriptId || `SCR-${s.id.substring(0, 6).toUpperCase()}`,
              code: s.scriptId,
              status: s.status,
              relatedClient: s.client?.name || '—',
              relatedBrand: s.brand?.name || '—',
              lastUpdatedDate: (s.updatedAt || s.createdAt).toISOString(),
              priority: s.priority,
              module: 'Scripts',
              url: `/scripts?scriptId=${s.id}`,
              subtitle: `${s.scriptId || 'SCR'} • Lang: ${s.language} • Product: ${s.product?.name || 'General'}`,
            }));
          }
        })()
      );
    }

    // 4. Equipment Advanced Filter (e.g. Equipment + Status, Brand + Status, Category + Status)
    if (!dto.module || dto.module === 'ALL' || dto.module === 'equipment') {
      promises.push(
        (async () => {
          const where: any = {};
          if (dto.status && dto.status !== 'ALL') where.status = dto.status;
          if (dto.brand) where.brand = { contains: dto.brand };
          if (dto.equipmentId) where.equipmentId = dto.equipmentId;
          else if (dto.equipment) {
            where.OR = [
              { name: { contains: dto.equipment } },
              { model: { contains: dto.equipment } },
              { equipmentId: { contains: dto.equipment } },
              { serialNumber: { contains: dto.equipment } },
            ];
          }

          if (dto.keywords) {
            where.OR = [
              { name: { contains: dto.keywords } },
              { model: { contains: dto.keywords } },
              { brand: { contains: dto.keywords } },
              { storageLocation: { contains: dto.keywords } },
            ];
          }

          const records = await this.prisma.equipment.findMany({
            where,
            take: 12,
            orderBy: { updatedAt: 'desc' },
          });

          if (records.length > 0) {
            results['Equipment'] = records.map((e) => ({
              id: e.id,
              entityType: 'Equipment',
              name: e.name,
              title: e.name,
              internalId: e.equipmentId || `EQ-${e.id.substring(0, 6).toUpperCase()}`,
              code: e.equipmentId,
              status: e.status,
              relatedClient: '—',
              relatedBrand: e.brand || '—',
              lastUpdatedDate: (e.updatedAt || e.createdAt).toISOString(),
              module: 'Equipment',
              url: `/equipment?equipmentId=${e.id}`,
              subtitle: `${e.equipmentId} • ${e.brand} ${e.model} • ${e.status}`,
            }));
          }
        })()
      );
    }

    // 5. Calendar Events Advanced Filter (e.g. Date Range + Client, Brand + Date Range)
    if (!dto.module || dto.module === 'ALL' || dto.module === 'calendar_events') {
      promises.push(
        (async () => {
          const where: any = {};
          if (dto.status && dto.status !== 'ALL') where.status = dto.status;
          if (dto.clientId) where.clientId = dto.clientId;
          else if (dto.client) where.client = { name: { contains: dto.client } };
          if (dto.brandId) where.brandId = dto.brandId;
          else if (dto.brand) where.brand = { name: { contains: dto.brand } };

          if (dto.dateFrom || dto.dateTo) {
            where.shootDate = {};
            if (dto.dateFrom) where.shootDate.gte = new Date(dto.dateFrom);
            if (dto.dateTo) where.shootDate.lte = new Date(dto.dateTo);
          }

          const records = await this.prisma.mediaCalendarEvent.findMany({
            where,
            include: { client: { select: { name: true } }, brand: { select: { name: true } } },
            take: 12,
            orderBy: { shootDate: 'desc' },
          });

          if (records.length > 0) {
            results['Calendar Events'] = records.map((ev) => ({
              id: ev.id,
              entityType: 'Calendar Event',
              name: ev.title,
              title: ev.title,
              internalId: `EVT-${ev.id.substring(0, 6).toUpperCase()}`,
              code: `EVT-${ev.id.substring(0, 6).toUpperCase()}`,
              status: ev.status,
              relatedClient: ev.client?.name || '—',
              relatedBrand: ev.brand?.name || '—',
              lastUpdatedDate: ev.createdAt.toISOString(),
              module: 'Calendar Events',
              url: `/calendar?eventId=${ev.id}`,
              subtitle: `${ev.shootType} Shoot • ${new Date(ev.shootDate).toLocaleDateString()}`,
            }));
          }
        })()
      );
    }

    await Promise.all(promises);

    const totalResults = Object.values(results).reduce((acc, list) => acc + list.length, 0);

    return {
      query: JSON.stringify(dto),
      tokens: Object.values(dto).filter((v) => typeof v === 'string' && v.trim().length > 0) as string[],
      totalResults,
      results,
      modulesSearched: Object.keys(results),
      searchCriteriaSupported: this.supportedCriteria,
    };
  }

  /**
   * User-Private Saved Filter Presets
   */
  async getSavedFilters(userId: string) {
    const userFilters = await this.prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Default System Presets available to every user
    const defaultPresets = [
      {
        id: 'preset_today_tasks',
        name: "Today's Tasks",
        icon: 'calendar',
        module: 'tasks',
        isSystem: true,
        filters: { module: 'tasks', dateRange: 'TODAY' },
      },
      {
        id: 'preset_pending_reviews',
        name: 'Pending Reviews',
        icon: 'check-circle',
        module: 'approvals',
        isSystem: true,
        filters: { module: 'approvals', status: 'PENDING' },
      },
      {
        id: 'preset_active_projects',
        name: 'Active Projects',
        icon: 'film',
        module: 'projects',
        isSystem: true,
        filters: { module: 'projects', status: 'ACTIVE' },
      },
      {
        id: 'preset_high_priority',
        name: 'High Priority Tasks',
        icon: 'alert-triangle',
        module: 'tasks',
        isSystem: true,
        filters: { module: 'tasks', priority: 'HIGH' },
      },
    ];

    const parsedUserFilters = userFilters.map((f) => ({
      ...f,
      filters: typeof f.filters === 'string' ? JSON.parse(f.filters) : f.filters,
    }));

    return [...defaultPresets, ...parsedUserFilters];
  }

  async saveFilter(userId: string, dto: { name: string; module?: string; icon?: string; filters: any }) {
    return this.prisma.savedFilter.create({
      data: {
        userId,
        name: dto.name,
        icon: dto.icon || 'filter',
        module: dto.module || 'ALL',
        filters: typeof dto.filters === 'string' ? dto.filters : JSON.stringify(dto.filters),
      },
    });
  }

  async deleteSavedFilter(userId: string, filterId: string) {
    return this.prisma.savedFilter.deleteMany({
      where: {
        id: filterId,
        userId, // Guarantees users can only delete their own private saved filters
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Clients Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class ClientsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'clients';
  readonly moduleDisplayName = 'Clients';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[], user: { role: string }): Promise<GlobalSearchResultItem[]> {
    if (user.role !== 'MEDIA_MANAGER' && user.role !== 'TECHNICAL_MANAGER' && user.role !== 'ADMIN') {
      return [];
    }

    const orClauses: any[] = [{ name: { contains: q } }, { companyName: { contains: q } }, { email: { contains: q } }];
    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ companyName: { contains: t } });
      orClauses.push({ contactPerson: { contains: t } });
      orClauses.push({ email: { contains: t } });
      orClauses.push({ internalNotes: { contains: t } });
    }

    const records = await this.prisma.client.findMany({
      where: { OR: orClauses },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((c) => ({
      id: c.id,
      entityType: 'Client',
      name: c.name,
      title: c.name,
      internalId: `CLI-${c.id.substring(0, 6).toUpperCase()}`,
      code: `CLI-${c.id.substring(0, 6).toUpperCase()}`,
      status: c.status,
      relatedClient: c.companyName || c.name,
      relatedBrand: '—',
      lastUpdatedDate: (c.updatedAt || c.createdAt).toISOString(),
      module: this.moduleDisplayName,
      url: `/clients?clientId=${c.id}`,
      subtitle: `${c.companyName || 'Client'} • Contact: ${c.contactPerson || c.email}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Brands Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class BrandsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'brands';
  readonly moduleDisplayName = 'Brands';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[], user: { role: string }): Promise<GlobalSearchResultItem[]> {
    if (user.role !== 'MEDIA_MANAGER' && user.role !== 'TECHNICAL_MANAGER' && user.role !== 'ADMIN') {
      return [];
    }

    const orClauses: any[] = [{ name: { contains: q } }, { shortCode: { contains: q } }];
    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ shortCode: { contains: t } });
      orClauses.push({ industry: { contains: t } });
      orClauses.push({ description: { contains: t } });
      orClauses.push({ client: { name: { contains: t } } });
    }

    const records = await this.prisma.brand.findMany({
      where: { OR: orClauses },
      include: { client: { select: { name: true } } },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((b) => ({
      id: b.id,
      entityType: 'Brand',
      name: b.name,
      title: b.name,
      internalId: b.shortCode || `BRD-${b.id.substring(0, 6).toUpperCase()}`,
      code: b.shortCode,
      status: b.status,
      relatedClient: b.client?.name || '—',
      relatedBrand: b.name,
      lastUpdatedDate: (b.updatedAt || b.createdAt).toISOString(),
      module: this.moduleDisplayName,
      url: `/brands?brandId=${b.id}`,
      subtitle: `${b.shortCode} • Client: ${b.client?.name || 'Brand'} • ${b.industry || 'Media'}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Products Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class ProductsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'products';
  readonly moduleDisplayName = 'Products';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const orClauses: any[] = [{ name: { contains: q } }, { productCode: { contains: q } }];
    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ productCode: { contains: t } });
      orClauses.push({ category: { contains: t } });
      orClauses.push({ internalNotes: { contains: t } });
      orClauses.push({ brand: { name: { contains: t } } });
    }

    const records = await this.prisma.product.findMany({
      where: { OR: orClauses },
      include: { brand: { include: { client: { select: { name: true } } } } },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((p) => ({
      id: p.id,
      entityType: 'Product',
      name: p.name,
      title: p.name,
      internalId: p.productCode || `PRD-${p.id.substring(0, 6).toUpperCase()}`,
      code: p.productCode,
      status: p.status,
      relatedClient: p.brand?.client?.name || '—',
      relatedBrand: p.brand?.name || '—',
      lastUpdatedDate: (p.updatedAt || p.createdAt).toISOString(),
      module: this.moduleDisplayName,
      url: `/products?productId=${p.id}`,
      subtitle: `${p.productCode} • Brand: ${p.brand?.name || 'Product'} • ${p.category || 'Item'}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Calendar Events Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class CalendarEventsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'calendar_events';
  readonly moduleDisplayName = 'Calendar Events';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const orClauses: any[] = [{ title: { contains: q } }, { shootType: { contains: q } }];
    for (const t of tokens) {
      orClauses.push({ title: { contains: t } });
      orClauses.push({ shootType: { contains: t } });
      orClauses.push({ influencerTalent: { contains: t } });
      orClauses.push({ productionNotes: { contains: t } });
      orClauses.push({ client: { name: { contains: t } } });
      orClauses.push({ brand: { name: { contains: t } } });
    }

    const records = await this.prisma.mediaCalendarEvent.findMany({
      where: { OR: orClauses },
      include: { client: { select: { name: true } }, brand: { select: { name: true } } },
      take: 8,
      orderBy: { shootDate: 'desc' },
    });

    return records.map((ev) => ({
      id: ev.id,
      entityType: 'Calendar Event',
      name: ev.title,
      title: ev.title,
      internalId: `EVT-${ev.id.substring(0, 6).toUpperCase()}`,
      code: `EVT-${ev.id.substring(0, 6).toUpperCase()}`,
      status: ev.status,
      relatedClient: ev.client?.name || '—',
      relatedBrand: ev.brand?.name || '—',
      lastUpdatedDate: ev.createdAt.toISOString(),
      priority: ev.priority,
      module: this.moduleDisplayName,
      url: `/calendar?eventId=${ev.id}`,
      subtitle: `${ev.shootType} Shoot • ${new Date(ev.shootDate).toLocaleDateString()}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Projects Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class ProjectsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'projects';
  readonly moduleDisplayName = 'Projects';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[], user: { id: string; role: string }): Promise<GlobalSearchResultItem[]> {
    const isManager = user.role === 'MEDIA_MANAGER' || user.role === 'TECHNICAL_MANAGER' || user.role === 'ADMIN';
    const orClauses: any[] = [{ name: { contains: q } }, { projectId: { contains: q } }, { shootLocation: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ projectId: { contains: t } });
      orClauses.push({ shootLocation: { contains: t } });
      orClauses.push({ locationAddress: { contains: t } });
      orClauses.push({ influencerTalent: { contains: t } });
      orClauses.push({ notes: { contains: t } });
      orClauses.push({ closureReason: { contains: t } });
      orClauses.push({ client: { name: { contains: t } } });
      orClauses.push({ brand: { name: { contains: t } } });
      orClauses.push({ createdBy: { name: { contains: t } } });
      orClauses.push({ assignedTeam: { some: { user: { name: { contains: t } } } } });
    }

    const where: any = { OR: orClauses };
    if (!isManager) {
      where.OR = [
        { assignedTeam: { some: { userId: user.id } } },
        { tasks: { some: { assignedEmployees: { some: { userId: user.id } } } } },
      ];
    }

    const records = await this.prisma.shootProject.findMany({
      where,
      include: { client: { select: { name: true } }, brand: { select: { name: true } } },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((p) => ({
      id: p.id,
      entityType: 'Project',
      name: p.name,
      title: p.name,
      internalId: p.projectId || `PRJ-${p.id.substring(0, 6).toUpperCase()}`,
      code: p.projectId,
      status: p.status,
      relatedClient: p.client?.name || '—',
      relatedBrand: p.brand?.name || '—',
      lastUpdatedDate: (p.updatedAt || p.createdAt).toISOString(),
      priority: p.priority,
      module: this.moduleDisplayName,
      url: `/projects?projectId=${p.id}`,
      subtitle: `${p.projectId || 'PRJ'} • Shoot: ${p.shootLocation}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Scripts Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class ScriptsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'scripts';
  readonly moduleDisplayName = 'Scripts';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[], user: { id: string; role: string }): Promise<GlobalSearchResultItem[]> {
    const isManager = user.role === 'MEDIA_MANAGER' || user.role === 'TECHNICAL_MANAGER' || user.role === 'ADMIN';
    const orClauses: any[] = [{ name: { contains: q } }, { scriptId: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ scriptId: { contains: t } });
      orClauses.push({ description: { contains: t } });
      orClauses.push({ objective: { contains: t } });
      orClauses.push({ remarks: { contains: t } });
      orClauses.push({ category: { contains: t } });
      orClauses.push({ project: { name: { contains: t } } });
      orClauses.push({ project: { projectId: { contains: t } } });
      orClauses.push({ client: { name: { contains: t } } });
      orClauses.push({ brand: { name: { contains: t } } });
      orClauses.push({ scriptAssignments: { some: { user: { name: { contains: t } } } } });
      orClauses.push({ scriptRemarks: { some: { message: { contains: t } } } });
    }

    const where: any = { OR: orClauses };
    if (!isManager) {
      where.scriptAssignments = { some: { userId: user.id } };
    }

    const records = await this.prisma.script.findMany({
      where,
      include: {
        project: { include: { client: { select: { name: true } }, brand: { select: { name: true } } } },
        client: { select: { name: true } },
        brand: { select: { name: true } },
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((s) => ({
      id: s.id,
      entityType: 'Script',
      name: s.name,
      title: s.name,
      internalId: s.scriptId || `SCR-${s.id.substring(0, 6).toUpperCase()}`,
      code: s.scriptId,
      status: s.status,
      relatedClient: s.client?.name || s.project?.client?.name || '—',
      relatedBrand: s.brand?.name || s.project?.brand?.name || '—',
      lastUpdatedDate: (s.updatedAt || s.createdAt).toISOString(),
      priority: s.priority,
      module: this.moduleDisplayName,
      url: `/scripts?scriptId=${s.id}`,
      subtitle: `${s.scriptId || 'SCR'} • Project: ${s.project?.name || 'Script'} • ${s.category}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Graphic Requirements Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class GraphicRequirementsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'graphic_requirements';
  readonly moduleDisplayName = 'Graphic Requirements';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const orClauses: any[] = [{ name: { contains: q } }, { requirementId: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ requirementId: { contains: t } });
      orClauses.push({ description: { contains: t } });
      orClauses.push({ objective: { contains: t } });
      orClauses.push({ remarks: { contains: t } });
      orClauses.push({ requirementType: { contains: t } });
      orClauses.push({ project: { name: { contains: t } } });
      orClauses.push({ project: { projectId: { contains: t } } });
      orClauses.push({ client: { name: { contains: t } } });
      orClauses.push({ brand: { name: { contains: t } } });
      orClauses.push({ remarksHistory: { some: { message: { contains: t } } } });
    }

    const records = await this.prisma.graphicRequirement.findMany({
      where: { OR: orClauses },
      include: {
        project: { include: { client: { select: { name: true } }, brand: { select: { name: true } } } },
        client: { select: { name: true } },
        brand: { select: { name: true } },
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((g) => ({
      id: g.id,
      entityType: 'Graphic Requirement',
      name: g.name,
      title: g.name,
      internalId: g.requirementId || `GRQ-${g.id.substring(0, 6).toUpperCase()}`,
      code: g.requirementId,
      status: g.status,
      relatedClient: g.client?.name || g.project?.client?.name || '—',
      relatedBrand: g.brand?.name || g.project?.brand?.name || '—',
      lastUpdatedDate: (g.updatedAt || g.createdAt).toISOString(),
      priority: g.priority,
      module: this.moduleDisplayName,
      url: `/graphic-requirements?reqId=${g.id}`,
      subtitle: `${g.requirementId || 'GRQ'} • Project: ${g.project?.name || 'Graphic'} • ${g.requirementType}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Tasks Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class TasksSearchProvider implements ISearchProvider {
  readonly moduleKey = 'tasks';
  readonly moduleDisplayName = 'Tasks';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[], user: { id: string; role: string }): Promise<GlobalSearchResultItem[]> {
    const isManager = user.role === 'MEDIA_MANAGER' || user.role === 'TECHNICAL_MANAGER' || user.role === 'ADMIN';
    const orClauses: any[] = [{ title: { contains: q } }, { taskId: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ title: { contains: t } });
      orClauses.push({ taskId: { contains: t } });
      orClauses.push({ description: { contains: t } });
      orClauses.push({ remarks: { contains: t } });
      orClauses.push({ project: { name: { contains: t } } });
      orClauses.push({ project: { projectId: { contains: t } } });
      orClauses.push({ script: { name: { contains: t } } });
      orClauses.push({ script: { scriptId: { contains: t } } });
      orClauses.push({ graphicRequirement: { name: { contains: t } } });
      orClauses.push({ graphicRequirement: { requirementId: { contains: t } } });
      orClauses.push({ client: { name: { contains: t } } });
      orClauses.push({ brand: { name: { contains: t } } });
      orClauses.push({ assignedEmployees: { some: { user: { name: { contains: t } } } } });
      orClauses.push({ remarksHistory: { some: { message: { contains: t } } } });
    }

    const where: any = { OR: orClauses };
    if (!isManager) {
      where.assignedEmployees = { some: { userId: user.id } };
    }

    const records = await this.prisma.task.findMany({
      where,
      include: {
        project: { include: { client: { select: { name: true } }, brand: { select: { name: true } } } },
        client: { select: { name: true } },
        brand: { select: { name: true } },
        assignedEmployees: { include: { user: { select: { name: true } } } },
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((t) => {
      const assignees = t.assignedEmployees.map((a) => a.user.name).join(', ') || 'Unassigned';
      return {
        id: t.id,
        entityType: 'Task',
        name: t.title,
        title: t.title,
        internalId: t.taskId || `TSK-${t.id.substring(0, 6).toUpperCase()}`,
        code: t.taskId,
        status: t.status,
        relatedClient: t.client?.name || t.project?.client?.name || '—',
        relatedBrand: t.brand?.name || t.project?.brand?.name || '—',
        lastUpdatedDate: (t.updatedAt || t.createdAt).toISOString(),
        priority: t.priority,
        module: this.moduleDisplayName,
        url: `/tasks?taskId=${t.id}`,
        subtitle: `${t.taskId || 'TSK'} • Project: ${t.project?.name || 'Task'} • Assignee: ${assignees}`,
      };
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Employees Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class EmployeesSearchProvider implements ISearchProvider {
  readonly moduleKey = 'employees';
  readonly moduleDisplayName = 'Employees & Staff';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const orClauses: any[] = [{ name: { contains: q } }, { email: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ email: { contains: t } });
      orClauses.push({ role: { contains: t } });
      orClauses.push({ employeeProfile: { designation: { contains: t } } });
      orClauses.push({ employeeProfile: { employeeCode: { contains: t } } });
      orClauses.push({ employeeProfile: { phone: { contains: t } } });
      orClauses.push({ employeeProfile: { internalNotes: { contains: t } } });
      orClauses.push({ employeeProfile: { department: { name: { contains: t } } } });
    }

    const records = await this.prisma.user.findMany({
      where: { OR: orClauses },
      include: {
        employeeProfile: {
          include: { department: { select: { name: true } } },
        },
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((u) => ({
      id: u.id,
      entityType: 'Employee',
      name: u.name,
      title: u.name,
      internalId: u.employeeProfile?.employeeCode || `EMP-${u.id.substring(0, 6).toUpperCase()}`,
      code: u.employeeProfile?.employeeCode,
      status: u.status,
      relatedClient: '—',
      relatedBrand: '—',
      lastUpdatedDate: (u.updatedAt || u.createdAt).toISOString(),
      module: this.moduleDisplayName,
      url: `/staff?employeeId=${u.id}`,
      subtitle: `${u.employeeProfile?.employeeCode || 'EMP'} • ${u.employeeProfile?.designation || u.role.replace(/_/g, ' ')} • ${u.employeeProfile?.department?.name || 'Operations'}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Equipment Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class EquipmentSearchProvider implements ISearchProvider {
  readonly moduleKey = 'equipment';
  readonly moduleDisplayName = 'Equipment';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const orClauses: any[] = [{ name: { contains: q } }, { equipmentId: { contains: q } }, { serialNumber: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ name: { contains: t } });
      orClauses.push({ equipmentId: { contains: t } });
      orClauses.push({ model: { contains: t } });
      orClauses.push({ brand: { contains: t } });
      orClauses.push({ category: { contains: t } });
      orClauses.push({ serialNumber: { contains: t } });
      orClauses.push({ storageLocation: { contains: t } });
      orClauses.push({ condition: { contains: t } });
      orClauses.push({ internalNotes: { contains: t } });
    }

    const records = await this.prisma.equipment.findMany({
      where: { OR: orClauses },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((e) => ({
      id: e.id,
      entityType: 'Equipment',
      name: e.name,
      title: e.name,
      internalId: e.equipmentId || `EQ-${e.id.substring(0, 6).toUpperCase()}`,
      code: e.equipmentId,
      status: e.status,
      relatedClient: '—',
      relatedBrand: e.brand || '—',
      lastUpdatedDate: (e.updatedAt || e.createdAt).toISOString(),
      module: this.moduleDisplayName,
      url: `/equipment?equipmentId=${e.id}`,
      subtitle: `${e.equipmentId} • ${e.category} • ${e.brand} ${e.model} • Location: ${e.storageLocation || 'Studio Vault'}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Communications Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class CommunicationsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'communications';
  readonly moduleDisplayName = 'Communications & Blockers';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const orClauses: any[] = [{ subject: { contains: q } }, { content: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ subject: { contains: t } });
      orClauses.push({ content: { contains: t } });
      orClauses.push({ blockerReason: { contains: t } });
      orClauses.push({ resolutionNotes: { contains: t } });
      orClauses.push({ type: { contains: t } });
      orClauses.push({ sender: { name: { contains: t } } });
      orClauses.push({ assignedTo: { name: { contains: t } } });
      orClauses.push({ project: { name: { contains: t } } });
      orClauses.push({ project: { projectId: { contains: t } } });
    }

    const records = await this.prisma.communication.findMany({
      where: { OR: orClauses },
      include: {
        sender: { select: { name: true } },
        project: { include: { client: { select: { name: true } }, brand: { select: { name: true } } } },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((c) => ({
      id: c.id,
      entityType: c.isBlocker ? 'Operational Blocker' : 'Communication',
      name: c.subject || (c.isBlocker ? `Blocker: ${c.blockerReason}` : 'Communication'),
      title: c.subject || (c.isBlocker ? `Blocker: ${c.blockerReason}` : 'Communication'),
      internalId: `COMM-${c.id.substring(0, 6).toUpperCase()}`,
      code: `COMM-${c.id.substring(0, 6).toUpperCase()}`,
      status: c.blockerStatus || (c.isBlocker ? 'OPEN' : 'POSTED'),
      relatedClient: c.project?.client?.name || '—',
      relatedBrand: c.project?.brand?.name || '—',
      lastUpdatedDate: c.createdAt.toISOString(),
      priority: c.priority || undefined,
      module: this.moduleDisplayName,
      url: `/activity?commId=${c.id}`,
      subtitle: `${c.isBlocker ? '[BLOCKER] ' : ''}Sender: ${c.sender?.name || 'Staff'} • Project: ${c.project?.name || 'General'}`,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Reports Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class ReportsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'reports';
  readonly moduleDisplayName = 'Reports & Analytics';

  private readonly standardReports = [
    { title: 'Executive Operations Dashboard', subtitle: 'Overall operations, health metrics, and composite productivity indices', url: '/reports', tags: 'executive operations overview summary' },
    { title: 'Employee Productivity & Target Report', subtitle: 'Target output vs actual deliverables, presence scoring, and weighting', url: '/reports?tab=productivity', tags: 'productivity target achievement score employee' },
    { title: 'Attendance & Presence Score Report', subtitle: 'Punctuality, shift presence percentages, late cutoffs, and half-day logs', url: '/reports?tab=attendance', tags: 'attendance presence shifts punctuality checkin' },
    { title: 'Deliverables & Output Volume Report', subtitle: 'Monthly, weekly, and daily deliverable counts by format and editor', url: '/reports?tab=deliverables', tags: 'deliverables output volume files video reels posters' },
    { title: 'Capacity Utilization & Overload Audit', subtitle: 'Active concurrent tasks, workload distribution, and capacity warnings', url: '/reports?tab=capacity', tags: 'capacity workload overload allocation team' },
    { title: 'Equipment Utilization & Maintenance Log', subtitle: 'Asset checkout frequency, damage reports, and maintenance lifecycle', url: '/reports?tab=equipment', tags: 'equipment inventory gear checkout cameras lenses' },
    { title: 'Automated Audit PDF & CSV Export Center', subtitle: 'Download permanent executive compliance and operational audit PDFs', url: '/reports?tab=export', tags: 'export pdf csv download audit report' },
  ];

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const qLower = q.toLowerCase();
    const matched = this.standardReports.filter((r) => {
      const targetText = `${r.title} ${r.subtitle} ${r.tags}`.toLowerCase();
      if (targetText.includes(qLower)) return true;
      return tokens.some((t) => targetText.includes(t));
    });

    return matched.map((r, idx) => ({
      id: `report_${idx}`,
      entityType: 'Report',
      name: r.title,
      title: r.title,
      internalId: `RPT-00${idx + 1}`,
      code: `RPT-00${idx + 1}`,
      status: 'AVAILABLE',
      relatedClient: 'Organization-Wide',
      relatedBrand: 'All Brands',
      lastUpdatedDate: new Date().toISOString(),
      module: this.moduleDisplayName,
      url: r.url,
      subtitle: r.subtitle,
      badge: 'Report',
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Documents Search Provider
// ─────────────────────────────────────────────────────────────────────────────
class DocumentsSearchProvider implements ISearchProvider {
  readonly moduleKey = 'documents';
  readonly moduleDisplayName = 'Documents & Media Files';

  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, tokens: string[]): Promise<GlobalSearchResultItem[]> {
    const orClauses: any[] = [{ fileName: { contains: q } }, { fileType: { contains: q } }];

    for (const t of tokens) {
      orClauses.push({ fileName: { contains: t } });
      orClauses.push({ fileType: { contains: t } });
      orClauses.push({ attachmentCategory: { contains: t } });
      orClauses.push({ storagePath: { contains: t } });
      orClauses.push({ project: { name: { contains: t } } });
      orClauses.push({ project: { projectId: { contains: t } } });
      orClauses.push({ uploadedBy: { name: { contains: t } } });
    }

    const records = await this.prisma.fileMetadata.findMany({
      where: { OR: orClauses },
      include: {
        project: { include: { client: { select: { name: true } }, brand: { select: { name: true } } } },
        uploadedBy: { select: { name: true } },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((f) => ({
      id: f.id,
      entityType: 'Document',
      name: f.fileName,
      title: f.fileName,
      internalId: `DOC-${f.id.substring(0, 6).toUpperCase()}`,
      code: `DOC-${f.id.substring(0, 6).toUpperCase()}`,
      status: f.activeVersion ? 'ACTIVE' : 'ARCHIVED',
      relatedClient: f.project?.client?.name || '—',
      relatedBrand: f.project?.brand?.name || '—',
      lastUpdatedDate: f.createdAt.toISOString(),
      module: this.moduleDisplayName,
      url: `/projects?projectId=${f.projectId}`,
      subtitle: `${f.attachmentCategory.replace(/_/g, ' ')} • ${f.fileType} (${(f.fileSize / 1024 / 1024).toFixed(2)} MB)`,
    }));
  }
}
