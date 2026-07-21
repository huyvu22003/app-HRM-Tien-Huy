export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export interface OrgPerson {
  id: number;
  code?: string | null;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  position: string | null;
  level: string | null;
  managerEmployeeId: number | null;
  managerName: string | null;
  phone: string | null;
}

export interface OrgNode {
  person: OrgPerson;
  children: OrgNode[];
  descendantIds: number[];
}

export interface OrgWarning {
  code: "cycle" | "missing-manager" | "ambiguous-manager" | "missing-director";
  employeeId?: number;
}

export interface OrgTreeResult {
  roots: OrgNode[];
  unassigned: OrgNode[];
  warnings: OrgWarning[];
}

export interface CompactOrgNode {
  person: OrgPerson;
  children: CompactOrgNode[];
  employees: OrgPerson[];
  descendantIds: number[];
}

export interface CompactDepartmentTreeResult {
  root: CompactOrgNode | null;
  additionalRoots: CompactOrgNode[];
  unassigned: CompactOrgNode[];
  warnings: OrgWarning[];
}

export interface RelationshipUpdate {
  employeeId: number;
  managerEmployeeId: number | null;
}

export function apiEmployeeToOrgPerson(employee: {
  id: number;
  code?: string | null;
  name: string;
  department_id: number | null;
  department_name: string | null;
  position: string | null;
  level: string | null;
  manager_employee_id?: number | null;
  manager_name?: string | null;
  manager?: string | null;
  phone: string | null;
}): OrgPerson {
  return {
    id: employee.id,
    code: employee.code ?? null,
    name: employee.name,
    departmentId: employee.department_id,
    departmentName: employee.department_name,
    position: employee.position,
    level: employee.level,
    managerEmployeeId: employee.manager_employee_id ?? null,
    managerName: employee.manager_name ?? employee.manager ?? null,
    phone: employee.phone,
  };
}

export function isManagementRole(person: Pick<OrgPerson, "position" | "level">): boolean {
  const value = `${person.position ?? ""} ${person.level ?? ""}`.toLocaleLowerCase("vi");
  return /(giám đốc|trưởng phòng|phó phòng|quản lý|xưởng trưởng|tổ trưởng|tổ phó|trưởng nhóm)/.test(value);
}

function roleRank(person: Pick<OrgPerson, "position" | "level">): number {
  const value = `${person.position ?? ""} ${person.level ?? ""}`.toLocaleLowerCase("vi");
  if (value.includes("giám đốc")) return 0;
  if (value.includes("trưởng phòng")) return 1;
  if (value.includes("phó phòng")) return 2;
  if (value.includes("quản lý") || value.includes("xưởng trưởng")) return 3;
  if (value.includes("tổ trưởng") || value.includes("trưởng nhóm")) return 4;
  if (value.includes("tổ phó")) return 5;
  return 10;
}

function comparePeople(a: OrgPerson, b: OrgPerson): number {
  return roleRank(a) - roleRank(b)
    || (a.position ?? "").localeCompare(b.position ?? "", "vi")
    || a.name.localeCompare(b.name, "vi")
    || a.id - b.id;
}

function resolveLegacyManager(person: OrgPerson, people: OrgPerson[]): { id: number | null; warning?: OrgWarning } {
  if (person.managerEmployeeId !== null) return { id: person.managerEmployeeId };
  const legacy = person.managerName?.trim();
  if (!legacy || legacy === "-") return { id: null };
  const key = normalizePersonName(legacy);
  const matches = people.filter(
    (candidate) => candidate.id !== person.id && normalizePersonName(candidate.name) === key,
  );
  if (matches.length === 1) return { id: matches[0].id };
  return {
    id: null,
    warning: {
      code: matches.length > 1 ? "ambiguous-manager" : "missing-manager",
      employeeId: person.id,
    },
  };
}

function makeTree(people: OrgPerson[], preferredRootId?: number | null): OrgTreeResult {
  const byId = new Map(people.map((person) => [person.id, person]));
  const warnings: OrgWarning[] = [];
  const flagged = new Set<number>();
  const parentById = new Map<number, number | null>();

  for (const person of people) {
    const resolved = resolveLegacyManager(person, people);
    if (resolved.warning) {
      warnings.push(resolved.warning);
      flagged.add(person.id);
    }
    const validParent = resolved.id !== null && byId.has(resolved.id) ? resolved.id : null;
    if (resolved.id !== null && validParent === null) {
      warnings.push({ code: "missing-manager", employeeId: person.id });
      flagged.add(person.id);
    }
    parentById.set(person.id, validParent);
  }

  for (const person of people) {
    const seen = new Set<number>([person.id]);
    let current = person.id;
    while (parentById.get(current) !== null && parentById.get(current) !== undefined) {
      const parent = parentById.get(current)!;
      if (seen.has(parent)) {
        parentById.set(person.id, null);
        warnings.push({ code: "cycle", employeeId: person.id });
        flagged.add(person.id);
        break;
      }
      seen.add(parent);
      current = parent;
    }
  }

  if (preferredRootId && byId.has(preferredRootId)) parentById.set(preferredRootId, null);

  const nodes = new Map<number, OrgNode>(
    people.map((person) => [person.id, { person, children: [], descendantIds: [] }]),
  );
  const rootNodes: OrgNode[] = [];
  const unassigned: OrgNode[] = [];

  for (const person of people) {
    const node = nodes.get(person.id)!;
    const parentId = parentById.get(person.id);
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else if (flagged.has(person.id) && person.id !== preferredRootId) {
      unassigned.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  const finalize = (node: OrgNode): number[] => {
    node.children.sort((a, b) => comparePeople(a.person, b.person));
    node.descendantIds = node.children.flatMap((child) => [child.person.id, ...finalize(child)]);
    return node.descendantIds;
  };
  rootNodes.sort((a, b) => comparePeople(a.person, b.person));
  unassigned.sort((a, b) => comparePeople(a.person, b.person));
  rootNodes.forEach(finalize);
  unassigned.forEach(finalize);
  return { roots: rootNodes, unassigned, warnings };
}

export function buildDepartmentHierarchy(
  allPeople: OrgPerson[],
  department: { departmentId: number; headEmployeeId?: number | null },
): OrgTreeResult {
  return makeTree(
    allPeople.filter((person) => person.departmentId === department.departmentId),
    department.headEmployeeId,
  );
}

export function selectDepartmentHeadId(
  allPeople: OrgPerson[],
  department: { departmentId: number; headEmployeeId?: number | null },
): number | null {
  const staff = allPeople.filter(
    (person) => person.departmentId === department.departmentId,
  );
  if (staff.some((person) => person.id === department.headEmployeeId)) {
    return department.headEmployeeId ?? null;
  }

  const staffIds = new Set(staff.map((person) => person.id));
  const candidates = staff.filter((person) => {
    const managerId = resolveLegacyManager(person, staff).id;
    return isManagementRole(person)
      && (managerId === null || !staffIds.has(managerId));
  });
  const bestRank = Math.min(...candidates.map(roleRank));
  const bestCandidates = candidates.filter((person) => roleRank(person) === bestRank);
  return bestCandidates.length === 1 ? bestCandidates[0].id : null;
}

function projectCompactNode(node: OrgNode): CompactOrgNode {
  const children: CompactOrgNode[] = [];
  const employees: OrgPerson[] = [];

  for (const child of node.children) {
    if (isManagementRole(child.person) || child.children.length > 0) {
      children.push(projectCompactNode(child));
    } else {
      employees.push(child.person);
    }
  }

  return {
    person: node.person,
    children,
    employees,
    descendantIds: [...node.descendantIds],
  };
}

export function buildCompactDepartmentHierarchy(
  allPeople: OrgPerson[],
  department: { departmentId: number; headEmployeeId?: number | null },
): CompactDepartmentTreeResult {
  const headEmployeeId = selectDepartmentHeadId(allPeople, department);
  const hierarchy = buildDepartmentHierarchy(allPeople, {
    departmentId: department.departmentId,
    headEmployeeId,
  });
  const rootNode = headEmployeeId === null
    ? null
    : hierarchy.roots.find((node) => node.person.id === headEmployeeId) ?? null;

  return {
    root: rootNode ? projectCompactNode(rootNode) : null,
    additionalRoots: hierarchy.roots
      .filter((node) => node !== rootNode)
      .map(projectCompactNode),
    unassigned: hierarchy.unassigned.map(projectCompactNode),
    warnings: hierarchy.warnings,
  };
}

export function buildCompanyHierarchy(
  people: OrgPerson[],
  departments: Array<{ id: number; headEmployeeId?: number | null }>,
): OrgTreeResult {
  const director = people
    .filter((person) => /giám đốc/i.test(`${person.position ?? ""} ${person.level ?? ""}`))
    .sort(comparePeople)[0];
  if (!director) {
    const result = makeTree(people);
    result.warnings.push({ code: "missing-director" });
    return result;
  }

  const patched = people.map((person) => {
    const isHead = departments.some((department) => department.headEmployeeId === person.id);
    if (isHead && person.id !== director.id && person.managerEmployeeId === null) {
      return { ...person, managerEmployeeId: director.id };
    }
    return person;
  });
  return makeTree(patched, director.id);
}

function descendantSet(employeeId: number, people: OrgPerson[]): Set<number> {
  const result = new Set<number>();
  const queue = [employeeId];
  while (queue.length) {
    const parentId = queue.shift()!;
    for (const person of people) {
      if (person.managerEmployeeId === parentId && !result.has(person.id)) {
        result.add(person.id);
        queue.push(person.id);
      }
    }
  }
  return result;
}

export function filterManagerCandidates(employeeId: number, people: OrgPerson[]): OrgPerson[] {
  const employee = people.find((person) => person.id === employeeId);
  if (!employee) return [];
  const descendants = descendantSet(employeeId, people);
  return people
    .filter(
      (candidate) =>
        candidate.id !== employeeId
        && candidate.departmentId === employee.departmentId
        && !descendants.has(candidate.id)
        && isManagementRole(candidate),
    )
    .sort(comparePeople);
}

export function filterInsertManagerCandidates(
  employeeId: number,
  people: OrgPerson[],
): OrgPerson[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const ancestors = new Set<number>();
  let managerId = byId.get(employeeId)?.managerEmployeeId ?? null;
  while (managerId !== null && !ancestors.has(managerId)) {
    ancestors.add(managerId);
    managerId = byId.get(managerId)?.managerEmployeeId ?? null;
  }
  return filterManagerCandidates(employeeId, people).filter(
    (candidate) => !ancestors.has(candidate.id),
  );
}

export function insertManagerPreview(
  people: OrgPerson[],
  input: { candidateId: number; branchRootId: number },
): { updates: RelationshipUpdate[] } {
  const candidate = people.find((person) => person.id === input.candidateId);
  const branchRoot = people.find((person) => person.id === input.branchRootId);
  if (!candidate || !branchRoot) return { updates: [] };
  return {
    updates: [
      { employeeId: candidate.id, managerEmployeeId: branchRoot.managerEmployeeId },
      { employeeId: branchRoot.id, managerEmployeeId: candidate.id },
    ],
  };
}

export function removeManagerPreview(
  people: OrgPerson[],
  employeeId: number,
): { updates: RelationshipUpdate[] } {
  const employee = people.find((person) => person.id === employeeId);
  if (!employee) return { updates: [] };
  const directReports = people.filter((person) => person.managerEmployeeId === employeeId);
  return {
    updates: [
      ...directReports.map((person) => ({
        employeeId: person.id,
        managerEmployeeId: employee.managerEmployeeId,
      })),
      { employeeId, managerEmployeeId: employee.managerEmployeeId },
    ],
  };
}

export function applyHierarchyUpdates(
  people: OrgPerson[],
  updates: RelationshipUpdate[],
): OrgPerson[] {
  const byEmployee = new Map(updates.map((update) => [update.employeeId, update.managerEmployeeId]));
  const names = new Map(people.map((person) => [person.id, person.name]));
  return people.map((person) => {
    if (!byEmployee.has(person.id)) return { ...person };
    const managerEmployeeId = byEmployee.get(person.id) ?? null;
    return {
      ...person,
      managerEmployeeId,
      managerName: managerEmployeeId ? names.get(managerEmployeeId) ?? null : null,
    };
  });
}
